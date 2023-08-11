import * as vscode from 'vscode'
import { getNonce } from '../utils/getNonce'
import { setUpCliStartupView, setUpWorkspaceStartupView } from '../utils/setUpViews'

export const enum STARTUP_VIEWS {
  CLI = 'cli',
  WORKSPACE = 'workspace',
}

enum BUTTON_TYPES {
  CLI = 'installedCli',
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
      if (data.btnType === BUTTON_TYPES.CLI) {
        const { shouldShowCliStartUpView, shouldShowWorkspaceView } = await this.checkView()
        if (shouldShowWorkspaceView && !shouldShowCliStartUpView) {
          webviewView.webview.html = this._getHtmlForWebview(webviewView.webview, STARTUP_VIEWS.WORKSPACE)
        }
      } else if (data.btnType === BUTTON_TYPES.WORKSPACE) {
        await vscode.commands.executeCommand('vscode.openFolder')
      }
    })
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel
  }

  private getScriptUri(webview: vscode.Webview): vscode.Uri {
    const isDebug = process.env.DEBUG_MODE === '1'
    const script = `startup.${isDebug ? 'ts' : 'js'}`
    return webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, isDebug ? 'src' : 'out', `scripts/${script}`),
    )
  }

  private getBodyHtml(
    view: STARTUP_VIEWS,
  ): string {
    let body = ''

    if (view === STARTUP_VIEWS.CLI) {
      body = `<br/>
        <p>In order to use DevCycle extension, please install DevCycle CLI.</p>
        <br/>
        <p>To install via npm, use the command: </p>
        <pre><code>npm install -g @devcycle/cli</code></pre>
        <br/>
        <p>To install via brew, use the command: </p>
        <pre><code>brew install devcycle-cli</code></pre>
        <br/>
        <button id="installedCli">I have installed DevCycle CLI</button>
        <br/>
        <p>To learn more about DevCycle and this extension, <a href="https://docs.devcycle.com">read our docs</a></p>
        `
    }
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
      vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'),
    )

    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'),
    )

    const scriptUri = this.getScriptUri(webview)

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
        ${this.getBodyHtml(view)}
        </body>
        <script nonce="${nonce}" src="${scriptUri}"></script>
        </html>`
  }

  private async checkView() {
    return {
      shouldShowCliStartUpView: await setUpCliStartupView(),
      shouldShowWorkspaceView: setUpWorkspaceStartupView()
    }
  }
}
