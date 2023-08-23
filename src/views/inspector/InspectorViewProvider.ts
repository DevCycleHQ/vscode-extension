import * as vscode from 'vscode'
import { getNonce } from '../../utils/getNonce'
import { OrganizationsCLIController, ProjectsCLIController, VariablesCLIController } from '../../cli'
import { executeRefreshUsagesCommand } from '../../commands/refreshUsages'
import path from 'path'
import { COMMAND_LOGOUT } from '../../commands/logout'
import { CodeUsageNode } from '../usages/UsagesTree/CodeUsageNode'
import { DetailsNode } from './DetailsNode'

type InspectorViewMessage =
  | { type: 'project' | 'organization', value: string, folderIndex: number }

export class InspectorViewProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView
    _doc?: vscode.TextDocument
    constructor(private readonly _extensionUri: vscode.Uri) {}
  
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

      })
    }
  
    public revive(panel: vscode.WebviewView) {
      this._view = panel
    }
  
    private async getBodyHtml(folder: vscode.WorkspaceFolder): Promise<string> {
      const variablesController = new VariablesCLIController(folder)
  
      const variables = await variablesController.getAllVariables()

      const inspectorOptions = ['Variable', 'Feature'].map((option) => (
        `<vscode-option value="${option}">${option}</vscode-option>`
      ))

      const variableOptions = Object.keys(variables).map((variable) => (
        `<vscode-option value="${variable}">${variable}</vscode-option>`
      ))
  
      return `
          <div class="inspector-container">
            <div class="inspector-dropdown-container">
              <vscode-dropdown id="variableId" class="inspector-dropdown" data-folder="${folder.index}" data-type="variable">
                ${inspectorOptions.join('')}
              </vscode-dropdown>
              <vscode-dropdown id="dataId" class="inspector-dropdown" data-folder="${folder.index}" data-type="project">
                ${variableOptions.join('')}
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
                  <span>Breh</span>
                </div>
                <div class="detail-entry">
                  <span>Key</span>
                  <span>Breh</span>
                </div>
                <div class="detail-entry">
                  <span>Feature</span>
                  <span>Breh</span>
                </div>
              </div>
            </div>
            <input id="collapsible-possible=values" class="toggle" type="checkbox" checked>
            <label for="collapsible-possible=values" class="lbl-toggle">
              <i class="codicon codicon-chevron-right"></i>
              <i class="codicon codicon-preserve-case"></i>
              Possible Values
            </label>
            <div class="collapsible-content">
              collapsible content goes here
            </div>
          </div>
      `
    }
  
    private async _getHtmlForWebview(
      webview: vscode.Webview,
    ) {
      const styleVSCodeUri = webview.asWebviewUri(
        vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'),
      )
      const webViewUri = webview.asWebviewUri(
        vscode.Uri.joinPath(this._extensionUri, 'out', 'webview.js'),
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
            <script type="module" nonce="${nonce}" src="${webViewUri}"/>
          </body>
        </html>`
    }
  }
  