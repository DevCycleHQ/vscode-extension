import * as vscode from 'vscode'
import { getNonce } from '../../utils/getNonce'
import { loginAndRefresh } from '../../utils/loginAndRefresh'

const enum ACTIONS {
  LOGIN = 'login',
}

const enum ERRORS {
  LOGIN = 'login',
}

interface Data {
  type: ACTIONS
}

export class LoginViewProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView
  _doc?: vscode.TextDocument
  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    }

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview)

    webviewView.webview.onDidReceiveMessage(async (data: Data) => {
      try {
        await loginAndRefresh()
      } catch (e) {
        webviewView.webview.html = this._getHtmlForWebview(
          webviewView.webview,
          ERRORS.LOGIN,
        )
      }
    })
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel
  }

  private getErrorHtml(error: ERRORS) {
    let errorMessage = ''
    if (error === ERRORS.LOGIN) {
      errorMessage = 'Login failed. Please try again.'
    }
    return `<p style="color:#F48771;">${errorMessage}</p>`
  }

  private _getHtmlForWebview(
    webview: vscode.Webview,
    error?: ERRORS,
  ) {
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'styles', 'reset.css'),
    )

    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'styles', 'vscode.css'),
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
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
        
        </head>
        <body>
        <main>
          <h3>Login to DevCycle:</h3>
          <button id="loginBtn">Login</button>
          ${error ? this.getErrorHtml(error) : ''}
        </main>
        </body>

        <script nonce="${nonce}">
          const vscode = acquireVsCodeApi()
          const loginBtn = document.querySelector('#loginBtn')
        
          loginBtn && loginBtn.addEventListener('click', () => {
            vscode.postMessage({
              type: 'login',
            })
          })
        </script>
        </html>`
  }
}
