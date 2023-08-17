import * as vscode from 'vscode'
import { getNonce } from '../../utils/getNonce'
import { AuthCLIController } from '../../cli'
import { executeRefreshUsagesCommand } from '../../commands/refreshUsages'

const enum VIEWS {
  DEFAULT = 'default',
}

const enum ACTIONS {
  LOGIN = 'login',
}

const enum ERRORS {
  LOGIN = 'login',
}

interface Data {
  type: string
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
      if (data.type === ACTIONS.LOGIN) {
        try {
          const folders = vscode.workspace.workspaceFolders || []

          for (const folder of folders) {
            const cli = new AuthCLIController(folder)
            await cli.login()
          }
          await executeRefreshUsagesCommand()

          await vscode.commands.executeCommand(
            'setContext',
            'devcycle-feature-flags.hasCredentialsAndProject',
            true,
          )
        } catch (e) {
          webviewView.webview.html = this._getHtmlForWebview(
            webviewView.webview,
            undefined,
            ERRORS.LOGIN,
          )
        }
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

  private getScriptUri(webview: vscode.Webview, view: string): vscode.Uri {
    const isDebug = process.env.DEBUG_MODE === '1'
    let script = ''
    if (view === VIEWS.DEFAULT) {
      script = `sidebar.${isDebug ? 'ts' : 'js'}`
    }
    return webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, isDebug ? 'src' : 'out', `scripts/${script}`),
    )
  }

  private getBodyHtml(view: string): string {
    let body = ''
    if (view === VIEWS.DEFAULT) {
      body = `<br/>
        <h3>Login to DevCycle:</h3>
        <button id="loginBtn">Login</button>`
    }
    return body
  }

  private getButtonScript(view: string, nonce: string) : string {
    let script = ''
    if (view === VIEWS.DEFAULT) {
      script = `
      <script nonce="${nonce}">
        const vscode = acquireVsCodeApi()
        const loginBtn = document.querySelector('#loginBtn')
      
        loginBtn && loginBtn.addEventListener('click', () => {
          vscode.postMessage({
            type: 'login',
          })
        })
      </script>
      `
    }
    return script
  }

  private _getHtmlForWebview(
    webview: vscode.Webview,
    view: VIEWS = VIEWS.DEFAULT,
    error?: ERRORS,
  ) {
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'),
    )

    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'),
    )

    const scriptUri = this.getScriptUri(webview, view)

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
        ${this.getBodyHtml(view)}
        ${error ? this.getErrorHtml(error) : ''}
        </body>
        ${this.getButtonScript(view, nonce)}
        </html>`
  }
}
