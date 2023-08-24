import * as vscode from 'vscode'
import { getNonce } from '../../utils/getNonce'
import { Feature, FeaturesCLIController, OrganizationsCLIController, ProjectsCLIController, Variable, VariablesCLIController } from '../../cli'

type InspectorViewMessage =
  | { type: 'variableOrFeature', value: 'Variable' | 'Feature', folderIndex: number }
  | { type: 'key', value: string, folderIndex: number }

export class InspectorViewProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView
    _doc?: vscode.TextDocument

    selectedType: 'Variable' | 'Feature'
    selectedKey: string

    variables: Record<string, Variable> = {}
    features: Record<string, Feature> = {}

    variablesCLIController?: VariablesCLIController
    featuresCLIController?: FeaturesCLIController

  constructor(private readonly _extensionUri: vscode.Uri) {
    this.selectedType = 'Variable'
    this.selectedKey = ''

    const folder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]
    if (!folder) {
      return
    }
    this.variablesCLIController = new VariablesCLIController(folder)
    this.featuresCLIController = new FeaturesCLIController(folder)

    this.variablesCLIController.getAllVariables().then((variables) => {
      this.variables = variables
      if (Object.values(this.variables).length) {
        this.selectedKey = Object.values(this.variables)[0].key
      }
    })

    this.featuresCLIController.getAllFeatures().then((features) => {
      this.features = features
    })
  }

  public async resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView

    webviewView.webview.options = {
      enableScripts: true,

      localResourceRoots: [this._extensionUri],
    }

    webviewView.webview.html = await this._getHtmlForWebview(webviewView.webview)

    webviewView.webview.onDidReceiveMessage(async (data: InspectorViewMessage) => {
      const folder = vscode.workspace.workspaceFolders?.[data.folderIndex]
      if (!folder) { return }

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
      }
      webviewView.webview.html = await this._getHtmlForWebview(webviewView.webview)
    })
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel
  }

  private async getBodyHtml(folder: vscode.WorkspaceFolder): Promise<string> {
    const inspectorOptions = ['Variable', 'Feature'].map((option) => (
      `<vscode-option value="${option}"${option === this.selectedType ? ' selected' : '' }>${option}</vscode-option>`
    ))

    const variableOptions = this.variables && Object.keys(this.variables).map((variable) => (
      `<vscode-option value="${variable}"${variable === this.selectedKey ? ' selected' : '' }>${variable}</vscode-option>`
    )) || []

    const featureOptions = this.features && Object.values(this.features).map((feature) => (
      `<vscode-option value="${feature._id}"${feature._id === this.selectedKey ? ' selected' : '' }>${feature.key}</vscode-option>`
    )) || []

    const name = this.selectedType === 'Variable' ? 
      this.variables[this.selectedKey]?.name : 
      this.features[this.selectedKey]?.name
    const key = this.selectedType === 'Variable' ? 
      this.variables[this.selectedKey]?.key : 
      this.features[this.selectedKey]?.key
    const featureName = this.selectedType === 'Variable' &&
      Object.values(this.features).find((feature) => feature._id === (this.variables[this.selectedKey] as Variable)?._feature)?.name

    const getAllPossibleValuesForVariable = (variable: Variable) => {
      const variableVariationValueMap: Record<string, unknown> = {}
      const feature = this.features[variable._feature]
      if (!feature) {
        return {}
      }
      for (const variation of feature.variations || []) {
        variableVariationValueMap[variation.name] = variation.variables?.[variable.key]
      }
      return variableVariationValueMap
    }
    const possibleValues = this.selectedType === 'Variable' && 
      Object.entries(getAllPossibleValuesForVariable(this.variables[this.selectedKey])).map((possibleValue) => {
        const variationName = possibleValue[0]
        return `<div class="detail-entry">
          <span>${variationName}</span>
          <span class="details-value">${possibleValue[1]}</span>
        </div>`
      }) || []
    const variableKeysInFeature = this.selectedType === 'Feature' && this.features[this.selectedKey].variables?.map((variable) => (
      `
      <div class="detail-entry">
        <span>${variable.key}</span>
      </div>`
    )) || []

    return `
        <div class="inspector-container">
          <div class="inspector-dropdown-container">
            <img src="${this._view?.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'inspector.svg'))}">
            <vscode-dropdown id="typeId" class="inspector-dropdown-type" data-folder="${folder.index}" data-type="variableOrFeature">
              ${inspectorOptions.join('')}
            </vscode-dropdown>
            <vscode-dropdown id="dataId" class="inspector-dropdown-value" data-folder="${folder.index}" data-type="key">
              ${this.selectedType === 'Variable' ? variableOptions.join('') : featureOptions.join('')}
            </vscode-dropdown>
          </div>
          <input id="collapsible-details" class="toggle" type="checkbox" checked>
          <label for="collapsible-details" class="lbl-toggle">
            <i class="codicon codicon-chevron-right"></i>
            <i class="codicon codicon-info"></i>
            Details
          </label>
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
            </div>
          </div>
          ${this.selectedType === 'Variable' ? 
          `
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
          ` : ''}
          ${this.selectedType === 'Feature' ? 
          `
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
          ` : ''}
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
      vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css')
    )

    const nonce = getNonce()
    const folder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]
    let body = ''
    if (folder) {
      body = await this.getBodyHtml(folder)
    }
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
            ${body}
          </main>
          <script type="module" nonce="${nonce}" src="${webViewUri}"></script>
        </body>
      </html>`
  }
}
