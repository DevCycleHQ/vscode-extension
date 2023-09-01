import * as vscode from 'vscode'
import { getNonce } from '../../utils/getNonce'
import { BaseCLIController, OrganizationsCLIController, ProjectsCLIController } from '../../cli'
import path from 'path'
import { COMMAND_LOGOUT } from '../../commands/logout'
import { KEYS, StateManager } from '../../StateManager'
import { updateRepoConfig } from '../../utils/updateRepoConfigProject'
import { executeRefreshAllCommand } from '../../commands'

type HomeViewMessage =
  | { type: 'project' | 'organization', value: string, folderIndex: number }
  | { type: 'config', folderIndex: number }
  | { type: 'logout' }

export class HomeViewProvider implements vscode.WebviewViewProvider {
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

    webviewView.webview.onDidReceiveMessage(async (data: HomeViewMessage) => {
      if (data.type === 'logout') {
        await vscode.commands.executeCommand(COMMAND_LOGOUT)
        return
      }

      const folder = vscode.workspace.workspaceFolders?.[data.folderIndex]
      if (!folder) { return }

      if (data.type === 'organization') {
        // TODO Add a generic loading state for sidebars that we can use while the organization is being fetched
        await vscode.window.withProgress(
          {
            location: { viewId: 'devcycle-home' },
          },
          async () => {
          StateManager.clearFolderState(folder.name)
          await StateManager.setFolderState(folder.name, KEYS.PROJECT_ID, undefined)
          await updateRepoConfig(folder, { project: null })
          const organizationsController = new OrganizationsCLIController(folder)
          await organizationsController.selectOrganization(data.value, false)
          await executeRefreshAllCommand()
          webviewView.webview.html = await this._getHtmlForWebview(webviewView.webview)
        })
      } else if (data.type === 'project') {
        const projectsController = new ProjectsCLIController(folder)
        await projectsController.selectProject(data.value)
        await executeRefreshAllCommand()
      } else if (data.type === 'config') {
        const folderPath = folder.uri.fsPath
        const cli = new BaseCLIController(folder)
        const { repoConfigPath } = await cli.status()
        const configPath = path.join(folderPath, repoConfigPath)
        const configUri = vscode.Uri.file(configPath)
        try {
          const document = await vscode.workspace.openTextDocument(configUri)
          await vscode.window.showTextDocument(document, { preview: false })
        } catch (_) {
          vscode.window.showErrorMessage(
            `DevCycle config does not exist or could not be opened.`,
          )
        }
      }
    })
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel
  }

  private async getBodyHtml(folder: vscode.WorkspaceFolder, showHeader?: boolean): Promise<string> {
    const organizationsController = new OrganizationsCLIController(folder)
    const projectsController = new ProjectsCLIController(folder)
    const activeProjectKey = StateManager.getFolderState(folder.name, KEYS.PROJECT_ID)
    const projects = await projectsController.getAllProjects()
    const organizations = await organizationsController.getAllOrganizations()
    const activeOrganizationName = StateManager.getFolderState(folder.name, KEYS.ORGANIZATION)?.name

    const projectId = `project${folder.index}`
    const organizationId = `organization${folder.index}`

    const orgOptions = Object.values(organizations).map((organization) =>
      `<vscode-option value="${organization.name}"${organization.name === activeOrganizationName ? ' selected' : '' }>${organization.display_name || organization.name}</vscode-option>`
    )
    const projectOptions = Object.values(projects).map((project) =>
      `<vscode-option value="${project.key}"${project.key === activeProjectKey ? ' selected' : ''}>${project.key}</vscode-option>`
    )
    if (!activeProjectKey) {
      projectOptions.unshift(`<vscode-option class="placeholder" selected>Select a project...</vscode-option>`)
    }

    return `
      ${
        showHeader ? `
        <input id="collapsible${folder.index}" class="toggle" type="checkbox" checked>
        <label for="collapsible${folder.index}" class="lbl-toggle">
        <i class="codicon codicon-chevron-right"></i>
        ${folder.name}
        </label>
        <div class="collapsible-content">
        <div class="collaspsible-content-indent"></div>
        ` : ''
      }
        <div class="home-view-form-container">
            <label class="home-view-dropdown-label">
              <i class="codicon codicon-briefcase"></i>Organization
            </label>
            <vscode-dropdown id="${organizationId}" class="home-dropdown" data-folder="${folder.index}" data-type="organization">
              ${orgOptions.join('')}
            </vscode-dropdown>
            <label class="home-view-dropdown-label">
              <i class="codicon codicon-star-empty"></i>Project</label>
            <vscode-dropdown id="${projectId}" class="home-dropdown" data-folder="${folder.index}" data-type="project">
              ${projectOptions.join('')}
            </vscode-dropdown>
          <button id="edit-config-button" class="icon-button edit-config-button" data-folder="${folder.index}">
            <i class="codicon codicon-edit"></i>Edit Config
          </button>
        </div>
      ${ showHeader ? ` </div>` : '' }
    `
  }

  private getLinkRow() {
    return `
    <div class="home-icon-link-group">
      <a href="https://docs.devcycle.com/" class="icon-link">
        <i class="codicon codicon-book"></i>
      </a>
      <a href="https://docs.devcycle.com/release-notes" class="icon-link">
        <i class="codicon codicon-bell"></i>
      </a>
      <a href="https://discord.gg/TQdnvcJH" class="icon-link">
        <i class="codicon codicon-comment-discussion"></i>
      </a>
      <a href="https://github.com/DevCycleHQ" class="icon-link">
        <i class="codicon codicon-github"></i>
      </a>
      <a href="https://app.devcycle.com/" class="icon-link">
        <i class="codicon codicon-globe"></i>
      </a>
    </div>
    `
  }

  private async _getHtmlForWebview(
    webview: vscode.Webview,
  ) {
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'styles', 'vscode.css'),
    )
    const homeViewStylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'styles', 'homeView.css'),
    )
    const webViewUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'homeView.js'),
    )

    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out','codicon.css')
    )
  
    const nonce = getNonce()
    let body = ''
    const showFolderHeaders = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 1
    for (const folder of vscode.workspace.workspaceFolders || []) {
      body += await this.getBodyHtml(folder, showFolderHeaders)
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
          <link href="${homeViewStylesUri}" rel="stylesheet">
          <link href="${codiconsUri}" rel="stylesheet"/>
        </head>
        <body>
          <div id="home-nav-intercept"></div>
          <div id="home-nav">
            ${this.getLinkRow()}
            <button id="logout-button" class="icon-button">
              <i class="codicon codicon-plug"></i>
              Log out
            </button>
          </div>
          <main id="home-view-main">
            <h5 class="view-subheader">Repo Settings</h5>
            ${body}
          </main>
          <script type="module" nonce="${nonce}" src="${webViewUri}"></script>
        </body>
      </html>`
  }
}
