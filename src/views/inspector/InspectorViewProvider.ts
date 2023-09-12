import * as vscode from 'vscode'
import { getNonce } from '../../utils/getNonce'
import { Environment, EnvironmentsCLIController, Feature, FeaturesCLIController, UsagesCLIController, Variable, VariablesCLIController, getOrganizationId } from '../../cli'
import { KEYS, StateManager } from '../../StateManager'
import { OPEN_USAGES_VIEW } from '../../commands'
import { INSPECTOR_VIEW_BUTTONS } from '../../components/hoverCard'

type InspectorViewMessage =
  | { type: 'variableOrFeature', value: 'Variable' | 'Feature' }
  | { type: 'key', value: string, buttonType?: INSPECTOR_VIEW_BUTTONS, selectedType?: 'Variable' | 'Feature' }
  | { type: 'folder', value: number }


const selectAProjectHtml = `<!DOCTYPE html>
<html lang="en">
  <body>
    <main>
      <p>Please select a project to view the inspector.</p>
    </main>
  </body>
</html>`

export class InspectorViewProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView
  _doc?: vscode.TextDocument

  selectedFolder: vscode.WorkspaceFolder | undefined
  selectedType: 'Variable' | 'Feature'
  selectedKey: string
  buttonType?: INSPECTOR_VIEW_BUTTONS

  variables: Record<string, Variable> = {}
  orderedVariables: Variable[] = []
  features: Record<string, Feature> = {}
  matches: Record<string, boolean> = {}
  isRefreshing: boolean = false
  webviewIsDisposed: boolean = false

  constructor(private readonly _extensionUri: vscode.Uri) {
    this.selectedType = 'Variable'
    this.selectedKey = ''
    this.selectedFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]
  }

  private async initializeFeaturesAndVariables(folder?: vscode.WorkspaceFolder) {
    if (!folder) {
      return
    }
    try {
      const variablesCLIController = new VariablesCLIController(folder)
      const featuresCLIController = new FeaturesCLIController(folder)
      const usagesCLIController = new UsagesCLIController(folder)

      this.variables = await variablesCLIController.getAllVariables()
      this.orderedVariables = Object.values(this.variables).sort((a: Variable, b: Variable) => (a.name || a.key).localeCompare(b.name || a.key))
      this.features = await featuresCLIController.getAllFeatures()
      this.matches = await usagesCLIController.usagesKeys()

      // default to the alphabetically first variable in variable list
      // only default if the currently selected key is no longer in the list of variables
      if (Object.values(this.variables).length && !this.variables[this.selectedKey]) {
        this.selectedKey = this.orderedVariables[0].key
      }
    } catch (e) {
      vscode.window.showErrorMessage(
        `Error initializing features and variables in inspector: ${e}`,
      )
    }
  }

  public async resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView

    webviewView.onDidDispose(() => {
      this.webviewIsDisposed = true
    })

    webviewView.webview.options = {
      enableScripts: true,
      enableCommandUris: true,
      localResourceRoots: [this._extensionUri],
    }

    await this.initializeFeaturesAndVariables(this.selectedFolder)
    webviewView.webview.html = await this._getHtmlForWebview(webviewView.webview)

    webviewView.webview.onDidReceiveMessage(async (data: InspectorViewMessage) => {
      if (data.type === 'variableOrFeature') {
        this.selectedType = data.value
        if (this.selectedType === 'Variable') {
          const variables = Object.keys(this.variables)
          this.selectedKey = variables[0] || ''
        } else {
          const features = Object.keys(this.features)
          this.selectedKey = features[0] || ''
        }
      } else if (data.type === 'key') {
        this.selectedType = data?.selectedType || this.selectedType
        this.selectedKey = data.value
        this.buttonType = data?.buttonType
      } else if (data.type === 'folder') {
        this.selectedFolder = vscode.workspace.workspaceFolders?.[data.value] as vscode.WorkspaceFolder
        this.matches = StateManager.getFolderState(this.selectedFolder.name, KEYS.CODE_USAGE_KEYS) || {}
        await this.initializeFeaturesAndVariables(this.selectedFolder)
      } 
      webviewView.webview.html = await this._getHtmlForWebview(webviewView.webview)
    })
    this.webviewIsDisposed = false
  }

  public async refreshAll() {
    if (this.isRefreshing) {
      return
    }

    const activeProjectKey = this.selectedFolder ? StateManager.getFolderState(this.selectedFolder.name, KEYS.PROJECT_ID) : undefined
    if (!activeProjectKey) {
      if (this._view) {
        this._view.webview.html = selectAProjectHtml
      }
      return
    }

    this.isRefreshing = true
    // Use withProgress to show a progress indicator
    await vscode.window.withProgress(
      {
        location: { viewId: 'devcycle-inspector' },
      },
      async () => {
        if (!(this.selectedFolder && vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.includes(this.selectedFolder))) {
          this.selectedFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]
        }

        if (!this._view || this.webviewIsDisposed) {
          return
        }
        await this.initializeFeaturesAndVariables(this.selectedFolder)
        this._view.webview.html = await this._getHtmlForWebview(this._view.webview)
      }
    )
    this.isRefreshing = false
  }

  public async refresh(folder: vscode.WorkspaceFolder) {
    this.refreshAll()
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel
  }

  public postMessageToWebview(message: unknown) {
    this._view?.webview.postMessage(message)
  }

  private async getBodyHtml(): Promise<string> {
    const inspectorOptions = ['Variable', 'Feature'].map((option) => (
      `<vscode-option value="${option}"${option === this.selectedType ? ' selected' : '' }>${option}</vscode-option>`
    ))

    const variableOptions = this.orderedVariables.map((variable) => (
      `<vscode-option value="${variable.key}"${variable.key === this.selectedKey ? ' selected' : '' }>${variable.key}</vscode-option>`
    )) || []

    const featureOptions = this.features && Object.values(this.features).sort((a, b) =>  (a.name || a.key).localeCompare(b.name || b.key)).map((feature) => (
      `<vscode-option value="${feature._id}"${feature._id === this.selectedKey ? ' selected' : '' }>${feature.key}</vscode-option>`
    )) || []

    const possibleValues = this.getPossibleValuesHTML()
    const variableKeysInFeature = this.getVariableKeysInFeatureHTML()
    if (!this.selectedFolder) {
      return ''
    }
    const environmentStatusesSection = await this.getFeatureEnvironmentStatusesHTML(this.selectedFolder)
    
    return `
        <div class="inspector-container">
          <div class="inspector-header">
            ${this.getSelectedFolderContainerHTML(this.selectedFolder)}
            <div class="inspector-svg-container">${this.inspectorSvg()}</div>
            <vscode-dropdown id="typeId" class="inspector-dropdown-type" data-type="variableOrFeature">
              ${inspectorOptions.join('')}
            </vscode-dropdown>
            <vscode-dropdown id="dataId" class="inspector-dropdown-value" data-type="key">
              ${this.selectedType === 'Variable' ? variableOptions.join('') : featureOptions.join('')}
            </vscode-dropdown>
          </div>
          <input id="collapsible-details" class="toggle" type="checkbox" checked>
          <label for="collapsible-details" class="lbl-toggle ${this.buttonType === 'details' ? 'focus' : ''}">
            <i class="codicon codicon-chevron-right"></i>
            <i class="codicon codicon-info"></i>
            Details
          </label>
          ${this.getDetailsHTML(this.selectedFolder)}
          ${this.selectedType === 'Variable' && possibleValues.length ? `
            <input id="collapsible-possible=values" class="toggle" type="checkbox" checked>
            <label for="collapsible-possible=values" class="lbl-toggle ${this.buttonType === 'values' ? 'focus' : ''}">
              <i class="codicon codicon-chevron-right"></i>
              <i class="codicon codicon-preserve-case"></i>
              Possible Values
            </label>
            <div class="collapsible-content">
              <div class="collaspsible-content-indent"></div>
              <div class="details-container">
                ${possibleValues.join('')}
              </div>
            </div>
            ` : ''
          }
          ${this.selectedType === 'Feature' ? `
            <input id="collapsible-possible=values" class="toggle" type="checkbox" checked>
            <label for="collapsible-possible=values" class="lbl-toggle">
              <i class="codicon codicon-chevron-right"></i>
              <i class="codicon codicon-preserve-case"></i>
              Variables
            </label>
            <div class="collapsible-content">
              <div class="collaspsible-content-indent"></div>
              <div class="details-container">
                ${variableKeysInFeature.join('')}
              </div>
            </div>
            ${environmentStatusesSection}
            ` : ''
      }
        </div>
    `
  }

  private async _getHtmlForWebview(
    webview: vscode.Webview,
  ) {
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'styles', 'vscode.css'),
    )
    const inspectorStylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'styles', 'inspector.css'),
    )
    const webViewUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'inspectorView.js'),
    )
    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out','codicon.css')
    )

    const nonce = getNonce()
    return `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <!--
            Use a content security policy to only allow loading images from https or from our extension directory,
            and only allow scripts that have a specific nonce.
          -->
          <meta http-equiv="Content-Security-Policy" content="img-src https: data:; style-src 'unsafe-inline' ${
            webview.cspSource
          }; script-src 'nonce-${nonce}';">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="${styleVSCodeUri}" rel="stylesheet">
          <link href="${inspectorStylesUri}" rel="stylesheet">
          <link href="${codiconsUri}" rel="stylesheet"/>
        </head>
        <body>
          <main>
            ${await this.getBodyHtml()}
          </main>
          <script type="module" nonce="${nonce}" src="${webViewUri}"></script>
        </body>
      </html>`
  }

  private getSelectedFolderContainerHTML(folder: vscode.WorkspaceFolder) {
    const folders = vscode.workspace.workspaceFolders
    if (!folders || folders.length === 1) {
      return ''
    }
    const folderOptions = folders.map((workspaceFolder) => (
      `<vscode-option value="${workspaceFolder.index}"${workspaceFolder.index === folder.index ? ' selected' : '' }>${workspaceFolder.name}</vscode-option>`
    ))
    return `
      <i class="codicon codicon-debug-breakpoint-log"></i>
      <label>${folder.name}</label>
      <vscode-dropdown id="folderId" class="inspector-dropdown-folder" data-type="folder">
        ${folderOptions.join('')}
      </vscode-dropdown>
    `
  }

  private getDetailsHTML(folder: vscode.WorkspaceFolder) {
    let name, key, featureName, status, createdAt, updatedAt, description, id
    if (this.selectedType === 'Variable') {
      name = this.variables[this.selectedKey]?.name
      key = this.variables[this.selectedKey]?.key
      createdAt = this.variables[this.selectedKey]?.createdAt
      updatedAt = this.variables[this.selectedKey]?.updatedAt
      status = this.variables[this.selectedKey]?.status
      id = this.variables[this.selectedKey]?._id
      featureName = Object.values(this.features).find((feature) => feature._id === (this.variables[this.selectedKey] as Variable)?._feature)?.name
    } else {
      name = this.features[this.selectedKey]?.name
      key = this.features[this.selectedKey]?.key
      id = this.variables[this.selectedKey]?._id
    }

    const projectId = StateManager.getFolderState(folder.name, KEYS.PROJECT_ID)
    const orgId = getOrganizationId(folder)
    const dashboardPath = this.selectedType === 'Variable' ?
      `variables/${this.variables[this.selectedKey].key}` :
      `features/${this.features[this.selectedKey].key}`
    const usagesCommandParams = encodeURIComponent(
      JSON.stringify({
        variableKey: this.selectedKey,
        folderUri: folder.uri
      })
    )
    const usagesCommand = `command:${OPEN_USAGES_VIEW}?${usagesCommandParams}`
    return `
      <div class="collapsible-content">
        <div class="collaspsible-content-indent"></div>
        <div class="details-container">
          <div class="detail-entry">
            <label>Name</label>
            <label class="details-value">${name || '(No Name)'}</label>
          </div>
          <div class="detail-entry">
            <label>Key</label>
            <label class="details-value">${key}</label>
          </div>
          <div class="detail-entry">
            <label>ID</label>
            <label class="details-value">${id}</label>
          </div>
          ${createdAt ?
            `<div class="detail-entry">
            <label>Created Date</label>
            <label class="details-value">${createdAt}</label>
          </div>` :
        ''}
          ${updatedAt ?
            `<div class="detail-entry">
            <label>Updated Date</label>
            <label class="details-value">${updatedAt}</label>
          </div>` :
        ''
          }
          ${status && status === 'archived' ?
            `<div class="detail-entry">
            <label>Status</label>
            <label class="details-value">${status}</label>
          </div>` :
        ''
          }
          ${featureName ?
            `<div class="detail-entry">
              <label>Feature</label>
              <div class="detail-entry-value-link" id="feature-link" data-value="${(this.variables[this.selectedKey] as Variable)?._feature}">
                <label class="details-value">${featureName}</label>
              <div>${this.inspectorSvg()}</div>
            </div>
          </div>` :
      ''}
          
          ${this.selectedType === 'Variable' && this.matches[this.selectedKey] ? `
            <div class="detail-entry">
              <a href="${vscode.Uri.parse(usagesCommand)}" class="detail-link-row">
                <i class="codicon codicon-symbol-keyword"></i>
                View Usages
              </a>
            </div>` : ''
      }
          <div class="detail-entry">
            <a href="https://app.devcycle.com/o/${orgId}/p/${projectId}/${dashboardPath}" class="detail-link-row">
              <i class="codicon codicon-globe"></i>
              View in Dashboard
            </a>
          </div>
        </div>
      </div>`
  }

  private getPossibleValuesHTML() {
    const getAllPossibleValuesForVariable = (variable?: Variable) => {
      const variableVariationValueMap: Record<string, unknown> = {}
      if (!variable) {
        return {}
      }

      const feature = this.features[variable._feature]
      if (!feature) {
        return {}
      }

      for (const variation of feature.variations || []) {
        variableVariationValueMap[variation.name] = variation.variables?.[variable.key]
      }
      return variableVariationValueMap
    }

    return this.selectedType === 'Variable' &&
      Object.entries(getAllPossibleValuesForVariable(this.variables[this.selectedKey])).map((possibleValue) => {
        const variationName = possibleValue[0]
        const stringifiedValue = JSON.stringify(possibleValue[1])
        const value = stringifiedValue.length > 40 ? `${stringifiedValue.slice(0, 40)}...` : stringifiedValue
        return `<div class="detail-entry">
          <label>${variationName}</label>
          <label class="details-value">${value}</label>
        </div>`
      }) || []
  }

  private getVariableKeysInFeatureHTML() {
    return this.selectedType === 'Feature' && this.features[this.selectedKey]?.variables?.map((variable) => (
      `
      <div class="detail-entry variable-link" data-value="${variable.key}">
        <label>${variable.key}</label>
        <div>${this.inspectorSvg()}</div>
      </div>
      `
    )) || []
  }

  private async getFeatureEnvironmentStatusesHTML(folder: vscode.WorkspaceFolder) {
    if (this.selectedType !== 'Feature') return ''

    function isRecordOfStringEnvironment(obj: any): obj is Record<string, Environment> {
      return typeof obj === 'object' && obj !== null && Object.keys(obj).length > 0
    }

    const featuresCLIController = new FeaturesCLIController(folder)
    const environmentsCLIController = new EnvironmentsCLIController(folder)

    const featureConfigs = await featuresCLIController.getFeatureConfigurations(this.selectedKey)
    const environments = await environmentsCLIController.getAllEnvironments()

    if (!isRecordOfStringEnvironment(environments)) {
      return ''
    }

    const html = featureConfigs.map((featureConfig) => {
      const environment = environments[featureConfig._environment]
      return `
      <div class="detail-entry">
        <label>${environment.name}</label>
        <label class="uppercase-value">${featureConfig.status}</label>
      </div>`
    })

    return `<input id="collapsible-environment-status" class="toggle" type="checkbox" checked>
    <label for="collapsible-environment-status" class="lbl-toggle">
      <i class="codicon codicon-chevron-right"></i>
      Status
    </label>
    <div class="collapsible-content">
      <div class="collaspsible-content-indent"></div>
      <div class="details-container">
        ${html.join('')}
      </div>
    </div>`
  }

  private inspectorSvg() {
    return `
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M6 10.052C6 7.81416 7.81416 6 10.052 6C12.2899 6 14.1041 7.81416 14.1041 10.052C14.1041 10.995 13.7818 11.8631 13.2415 12.5516L16.8571 16.1672C17.0476 16.3577 17.0476 16.6666 16.8571 16.8571C16.6666 17.0476 16.3577 17.0476 16.1672 16.8571L12.5516 13.2415C11.8631 13.7818 10.995 14.1041 10.052 14.1041C7.81416 14.1041 6 12.2899 6 10.052ZM10.052 6.97563C8.35299 6.97563 6.97563 8.35299 6.97563 10.052C6.97563 11.7511 8.35299 13.1284 10.052 13.1284C11.7511 13.1284 13.1284 11.7511 13.1284 10.052C13.1284 8.35299 11.7511 6.97563 10.052 6.97563Z" fill="var(--vscode-foreground)"/>
      <path fill-rule="evenodd" clip-rule="evenodd" d="M13 1.75H1V1H13V1.75Z" fill="var(--vscode-foreground)"/>
      <path fill-rule="evenodd" clip-rule="evenodd" d="M10 3.75H1V3H10V3.75Z" fill="var(--vscode-foreground)"/>
      <path fill-rule="evenodd" clip-rule="evenodd" d="M6.25 5.75H1V5H6.25V5.75Z" fill="var(--vscode-foreground)"/>
      <path fill-rule="evenodd" clip-rule="evenodd" d="M4 7.75H1V7H4V7.75Z" fill="var(--vscode-foreground)"/>
      <path fill-rule="evenodd" clip-rule="evenodd" d="M2.5 9.75H1V9H2.5V9.75Z" fill="var(--vscode-foreground)"/>
    </svg>
    `
  }
}
