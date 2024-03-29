import * as vscode from 'vscode'
import { getNonce } from '../../utils/getNonce'

export const enum STARTUP_VIEWS {
  WORKSPACE = 'workspace',
}

enum BUTTON_TYPES {
  WORKSPACE = 'openFolder',
}

export class StartupViewProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView

  constructor(private readonly _extensionUri: vscode.Uri, private viewType: STARTUP_VIEWS) { }

  public async resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView

    webviewView.webview.options = {
      enableScripts: true,

      localResourceRoots: [this._extensionUri],
    }

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview, this.viewType)

    webviewView.webview.onDidReceiveMessage(async (data: { btnType: BUTTON_TYPES }) => {
      if (data.btnType === BUTTON_TYPES.WORKSPACE) {
        await vscode.commands.executeCommand('vscode.openFolder')
      }
    })
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel
  }

  private getBodyHtml(
    view: STARTUP_VIEWS,
  ): string {
    let body = ''

    if (view === STARTUP_VIEWS.WORKSPACE) {
      body = `<br/>
        <p>In order to use DevCycle features, open a folder.</p>
        <button id="openFolder">Open folder</button>
        <p>To learn more about DevCycle and this extension, <a href="https://docs.devcycle.com">read our docs</a></p>
        `
    }
    return body
  }

  private _getHtmlForWebview(
    webview: vscode.Webview,
    view: STARTUP_VIEWS,
  ) {
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'styles', 'reset.css'),
    )

    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'styles', 'vscode.css'),
    )

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'startup.js'),
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
        <meta http-equiv="Content-Security-Policy" content="img-src https: data:; style-src 'unsafe-inline' ${webview.cspSource
      }; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
        
        </head>
        <body>
          <main id="devcycle-startup">
          ${this.getBodyHtml(view)}
          </main>
        </body>
        <script nonce="${nonce}" src="${scriptUri}"></script>
        </html>`
  }
}
