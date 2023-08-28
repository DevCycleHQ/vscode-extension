import * as vscode from 'vscode'
import { getNonce } from '../../utils/getNonce'
import { Feature, FeaturesCLIController, UsagesCLIController, Variable, VariablesCLIController, getOrganizationId } from '../../cli'
import { KEYS, StateManager } from '../../StateManager'
import { OPEN_USAGES_VIEW } from '../../commands'

type InspectorViewMessage =
  | { type: 'variableOrFeature', value: 'Variable' | 'Feature' }
  | { type: 'key', value: string }
  | { type: 'folder', value: number }

export class InspectorViewProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView
    _doc?: vscode.TextDocument

    selectedFolder: vscode.WorkspaceFolder | undefined
    selectedType: 'Variable' | 'Feature'
    selectedKey: string

    variables: Record<string, Variable> = {}
    orderedVariables: Variable[] = []
    features: Record<string, Feature> = {}
    matches: Record<string, boolean> = {}
    isRefreshing: boolean = false

  constructor(private readonly _extensionUri: vscode.Uri) {
    this.selectedType = 'Variable'
    this.selectedKey = ''
    this.selectedFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]

    const folder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]
    if (!folder) {
      return
    }
    
    this.initializeFeaturesAndVariables(folder)
  }

  private async initializeFeaturesAndVariables(folder: vscode.WorkspaceFolder) {
    try {
      const variablesCLIController = new VariablesCLIController(folder)
      const featuresCLIController = new FeaturesCLIController(folder)
      const usagesCLIController = new UsagesCLIController(folder)
      
      this.variables = await variablesCLIController.getAllVariables()
      this.orderedVariables = Object.values(this.variables).sort((a: Variable, b: Variable) => a.name.localeCompare(b.name))
      this.features = await featuresCLIController.getAllFeatures()
      this.matches = await usagesCLIController.usagesKeys()
      
      // default to the alphabetically first variable in variable list
      if (Object.values(this.variables).length) {
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

    webviewView.webview.options = {
      enableScripts: true,
      enableCommandUris: true,
      localResourceRoots: [this._extensionUri],
    }

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
        this.selectedKey = data.value
      } else if (data.type === 'folder') {
        this.selectedFolder = vscode.workspace.workspaceFolders?.[data.value] as vscode.WorkspaceFolder
        this.matches = StateManager.getFolderState(this.selectedFolder.name, KEYS.CODE_USAGE_KEYS) || {}
      }
      webviewView.webview.html = await this._getHtmlForWebview(webviewView.webview)
    })
  }

  public async refreshAll() {
    if (this.isRefreshing) {
      return
    }

    this.isRefreshing = true

    // Use withProgress to show a progress indicator
    await vscode.window.withProgress(
      {
        location: { viewId: 'devcycle-inspector' },
      },
      async () => {
        const folder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]
        if (!folder || !this._view) {
          return
        }
        this.selectedFolder = folder
        await this.initializeFeaturesAndVariables(folder)
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

  private async getBodyHtml(): Promise<string> {
    const inspectorOptions = ['Variable', 'Feature'].map((option) => (
      `<vscode-option value="${option}"${option === this.selectedType ? ' selected' : '' }>${option}</vscode-option>`
    ))

    const variableOptions = this.orderedVariables.map((variable) => (
      `<vscode-option value="${variable.key}"${variable.key === this.selectedKey ? ' selected' : '' }>${variable.key}</vscode-option>`
    )) || []

    const featureOptions = this.features && Object.values(this.features).sort((a, b) =>  a.name.localeCompare(b.name)).map((feature) => (
      `<vscode-option value="${feature._id}"${feature._id === this.selectedKey ? ' selected' : '' }>${feature.key}</vscode-option>`
    )) || []

    const possibleValues = this.getPossibleValuesHTML()
    const variableKeysInFeature = this.getVariableKeysInFeatureHTML()
    if (!this.selectedFolder) {
      return ''
    }

    return `
        <div class="inspector-container">
          ${this.getSelectedFolderContainerHTML(this.selectedFolder)}
          <div class="inspector-dropdown-container">
            <img src="${this._view?.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'inspector.svg'))}">
            <vscode-dropdown id="typeId" class="inspector-dropdown-type" data-type="variableOrFeature">
              ${inspectorOptions.join('')}
            </vscode-dropdown>
            <vscode-dropdown id="dataId" class="inspector-dropdown-value" data-type="key">
              ${this.selectedType === 'Variable' ? variableOptions.join('') : featureOptions.join('')}
            </vscode-dropdown>
          </div>
          <input id="collapsible-details" class="toggle" type="checkbox" checked>
          <label for="collapsible-details" class="lbl-toggle">
            <i class="codicon codicon-chevron-right"></i>
            <i class="codicon codicon-info"></i>
            Details
          </label>
          ${this.getDetailsHTML(this.selectedFolder)}
          ${this.selectedType === 'Variable' && possibleValues.length ? `
            <input id="collapsible-possible=values" class="toggle" type="checkbox" checked>
            <label for="collapsible-possible=values" class="lbl-toggle">
              <i class="codicon codicon-chevron-right"></i>
              <i class="codicon codicon-preserve-case"></i>
              Possible Values
            </label>
            <div class="collapsible-content">
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
              <div class="details-container">
                ${variableKeysInFeature.join('')}
              </div>
            </div>
            ` : ''
          }
        </div>
    `
  }

  private async _getHtmlForWebview(
    webview: vscode.Webview,
  ) {
    const styleVSCodeUri = webview.asWebviewUri(
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
      <div class="multiple-folder-container">
        <i class="codicon codicon-debug-breakpoint-log"></i>
        <span>${folder.name}</span>
        <vscode-dropdown id="folderId" class="inspector-dropdown-folder" data-type="folder">
          ${folderOptions.join('')}
        </vscode-dropdown>
      </div>
    `
  }

  private getDetailsHTML(folder: vscode.WorkspaceFolder) {
    const name = this.selectedType === 'Variable' ? 
      this.variables[this.selectedKey]?.name : 
      this.features[this.selectedKey]?.name
    const key = this.selectedType === 'Variable' ? 
      this.variables[this.selectedKey]?.key : 
      this.features[this.selectedKey]?.key
    const featureName = this.selectedType === 'Variable' &&
      Object.values(this.features).find((feature) => feature._id === (this.variables[this.selectedKey] as Variable)?._feature)?.name

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
        <div class="details-container">
          <div class="detail-entry">
            <span>Name</span>
            <span class="details-value">${name || '(No Name)'}</span>
          </div>
          <div class="detail-entry">
            <span>Key</span>
            <span class="details-value">${key}</span>
          </div>
          ${featureName ?
            `<div class="detail-entry">
              <span>Feature</span>
              <span class="details-value">${featureName}</span>
            </div>` :
            ''
          }
          
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
        return `<div class="detail-entry">
          <span>${variationName}</span>
          <span class="details-value">${possibleValue[1]}</span>
        </div>`
      }) || []
  }

  private getVariableKeysInFeatureHTML() {
    return this.selectedType === 'Feature' && this.features[this.selectedKey].variables?.map((variable) => (
      `
      <div class="detail-entry">
        <span>${variable.key}</span>
      </div>`
    )) || []

  }
}
