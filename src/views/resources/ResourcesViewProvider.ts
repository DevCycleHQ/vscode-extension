import * as vscode from 'vscode'

export class ResourcesViewProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView
  _doc?: vscode.TextDocument
  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView

    webviewView.webview.options = {
      localResourceRoots: [this._extensionUri],
    }

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview)
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel
  }

  private _getHtmlForLink(label: string, icon: string, href: string) {
    return `<a
      class="nav-list__item"
      href="${href}"
      title="${label}"
      aria-label="${label}"
    >
      <i class="codicon codicon-${icon}"></i>
      <span class="nav-list__label">${label}</span>
    </a>`
  }

  private _getHtmlForWebview(
    webview: vscode.Webview,
  ) {
    const vscodeStylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'styles', 'vscode.css')
    )
    const resourceStylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'styles', 'resources.css')
    )
    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css')
    )

    return `<!DOCTYPE html>
			<html lang="en">
        <head>
          <meta charset="utf-8" />
          <link href="${vscodeStylesUri}" rel="stylesheet" />
          <link href="${codiconsUri}" rel="stylesheet" />
          <link href="${resourceStylesUri}" rel="stylesheet" />
        </head>

        <body class="home preload" data-placement="#{placement}">
          <main id="main">
            <nav class="nav-list">
              <h5 class="view-subheader">Documentation</h5>
              ${this._getHtmlForLink('Documentation', 'book', 'https://docs.devcycle.com/')}
              ${this._getHtmlForLink('Guides', 'repo-clone', 'https://docs.devcycle.com/best-practices/')}
              ${this._getHtmlForLink('Management API Reference', 'library', 'https://docs.devcycle.com/management-api/')}
              ${this._getHtmlForLink('Bucketing API Reference', 'clippy', 'https://docs.devcycle.com/bucketing-api/')}

              <h5 class="view-subheader">Useful Links</h5>
              ${this._getHtmlForLink('DevCycle Dashboard', 'globe', 'https://app.devcycle.com/')}
              ${this._getHtmlForLink('Changelog', 'bell', 'https://github.com/DevCycleHQ/vscode-extension/releases')}
              ${this._getHtmlForLink('Roadmap', 'flame', 'https://docs.devcycle.com/product-roadmap')}
              ${this._getHtmlForLink('DevCycle on GitHub', 'github', 'https://github.com/DevCycleHQ')}
              ${this._getHtmlForLink('Community Discord', 'comment-discussion', 'https://discord.gg/8uEqSsRKy5')}
              ${this._getHtmlForLink('CLI Reference', 'terminal', 'https://docs.devcycle.com/cli/')}
            </nav>
          </main>
        </body>
      </html>`
  }
}
