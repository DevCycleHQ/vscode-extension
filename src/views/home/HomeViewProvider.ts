import * as vscode from 'vscode'
import { getNonce } from '../../utils/getNonce'
import { OrganizationsCLIController, ProjectsCLIController } from '../../cli'

interface DropdownChangeEvent {
  type: 'project' | 'organization',
  value: string,
  folderIndex: number
}

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

    webviewView.webview.onDidReceiveMessage(async (data: DropdownChangeEvent) => {
      const folder = vscode.workspace.workspaceFolders?.[data.folderIndex]
      // TODO (home view) get switching org/ project working
      if (folder && data.type === 'organization') {
        const organizationsController = new OrganizationsCLIController(folder)
        await organizationsController.selectOrganization(data.value, false)
        webviewView.webview.html = await this._getHtmlForWebview(webviewView.webview) // refresh view to get new projects
      } else if (folder && data.type === 'project') {
        const projectsController = new ProjectsCLIController(folder)
        await projectsController.selectProject(data.value)
      }
    })
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel
  }

  private async getBodyHtml(folder: vscode.WorkspaceFolder, showHeader?: boolean): Promise<string> {
    const organizationsController = new OrganizationsCLIController(folder)
    const projectsController = new ProjectsCLIController(folder)

    const projectKeys = await projectsController.getAllProjects()
    const organizations = await organizationsController.getAllOrganizations()
    const activeProjectKey = await projectsController.getActiveProject()
    const activeOrganizationName = (await organizationsController.getActiveOrganization())?.name
    // TODO (home view) active project is sometimes undefined when have multiple folders open

    const projectId = `project${folder.index}`
    const organizationId = `organization${folder.index}`

    return `
      <div class="form-container">
        ${showHeader ? `<h3>${folder.name}</h3>`: ''}
        <div class="dropdown-container">
          <label for="${organizationId}">Organization:</label>
          <select id="${organizationId}" name="organization">
            ${Object.values(organizations).map((organization) => 
              `<option value="${organization.id}" ${organization.name === activeOrganizationName ? 'selected' : ''}>${organization.display_name || organization.name}</option>`
            )}
          </select>
        </div>
        <div class="dropdown-container">
          <label for="${projectId}">Project:</label>
          <select id="${projectId}" name="project">
            ${Object.values(projectKeys).map((project) => `<option value="${project}" ${project === activeProjectKey ? 'selected' : ''}>${project}</option>`)}
          </select>
        </div>
      </div>
      <a>✎ Edit Config </a>
      <vscode-dropdown>
        <vscode-option value="option1">Option 1</vscode-option>
        <vscode-option value="option2">Option 2</vscode-option>
        <vscode-option value="option3">Option 3</vscode-option>
      </vscode-dropdown>
    ` // TODO (home view) add link to 'edit config' and add icons
  }

  private getDropdownScript(folder: vscode.WorkspaceFolder) : string {
    const projectId = `project${folder.index}`
    const organizationId = `organization${folder.index}`

    return `
      element = document.querySelector('#${projectId}')
      element?.addEventListener('change', (event) => {
        vscode.postMessage({
          type: 'project',
          value: element?.value,
          folderIndex: ${folder.index}
        })
      })

      element = document.querySelector('#${organizationId}')
      element?.addEventListener('change', (event) => {
        vscode.postMessage({
          type: 'organization',
          value: element?.value,
          folderIndex: ${folder.index}
        })
      })
      \n
    `
  }

  private getButtonRow() { // TODO (home view) add real links, icons, and styling
    return `
    <div>
        <a href="https://www.example.com" class="icon-button">
            <img src="icon1.png" alt="Documentation">
        </a>
        <a href="https://www.example.com" class="icon-button">
            <img src="icon2.png" alt="Announcements">
        </a>
        <a href="https://www.example.com" class="icon-button">
            <img src="icon3.png" alt="Discord">
        </a>
        <a href="https://www.example.com" class="icon-button">
            <img src="icon3.png" alt="Github">
        </a>
        <a href="https://www.example.com" class="icon-button">
            <img src="icon4.png" alt="Twitter">
        </a>
        <a href="https://www.example.com" class="icon-button">
            <img src="icon5.png" alt="Dashboard">
        </a>
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

    const nonce = getNonce()
    let body = ''
    let script = ''
    const showFolderHeaders = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 1
    for (const folder of vscode.workspace.workspaceFolders || []) {
      body += await this.getBodyHtml(folder, showFolderHeaders)
      script += this.getDropdownScript(folder)
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
        </head>
        <body>
          ${this.getButtonRow()}
          ${body}
          <script type="module" nonce="${nonce} src=${webViewUri}">
            const vscode = acquireVsCodeApi()
            ${script}
          </script>
        </body>
      </html>`
  }
}
