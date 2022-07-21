import * as vscode from 'vscode'
import * as cp from 'child_process'

type CommandResponse = {
  output: string,
  error: Error | null,
  code: number
}

type DevCycleStatus = {
  version: string
  repoConfigPath: string
  repoConfigExists: 'true' | 'false'
  userConfigPath: string
  userConfigExists: 'true' | 'false'
  authConfigPath: string
  hasAccessToken: 'true' | 'false'
}
export default class DevcycleCLIController {
  public async login() {
    const { code, error } = await this.execDvc('login sso --headless')
    if (code === 0) {
      vscode.window.showInformationMessage('Logged into DevCycle')
    } else {
      vscode.window.showInformationMessage(`Logout failed ${error?.message}}`)
    }
  }

  public async status(): Promise<DevCycleStatus> {
    const { output } = await this.execDvc('status --headless')
    return JSON.parse(output) as DevCycleStatus
  }

  public async usages(): Promise<string> {
    const { output } = await this.execDvc('usages')
    return output
  }

  public async logout() {
    const { code, error } = await this.execDvc('logout --headless')
    if (code === 0) {
      vscode.window.showInformationMessage('Logged out of DevCycle')
    } else {
      vscode.window.showInformationMessage(`Logout failed ${error?.message}}`)
    }
  }

  public async selectOrganization() {
    const { code, error } = await this.execDvc('org --headless')
    if (code === 0) {
      vscode.window.showInformationMessage(`Repo configured to use org`)
    } else {
      vscode.window.showInformationMessage(`Organization selection failed: ${error?.message}}`)
    }
  }

  public async listProjects() {
    const { code, error, output } = await this.execDvc('projects list')
    if (code === 0) {
      vscode.window.showInformationMessage(`Repo configured to use project`)
    } else {
      vscode.window.showInformationMessage(`Project selection failed: ${error?.message}}`)
    }
    return JSON.parse(output) as string[]
  }

  public async selectProject() {
    const { code, error } = await this.execDvc('projects select')
    if (code === 0) {
      vscode.window.showInformationMessage(`Repo configured to use project`)
    } else {
      vscode.window.showInformationMessage(`Project selection failed: ${error?.message}}`)
    }
  }

  private execDvc(cmd: string) {
    // return this.execShell(`dvc ${cmd}`)
    return this.execShell(`~/repos/cli/bin/dev ${cmd}`)
  }

  private execShell(cmd: string) {
    return new Promise<CommandResponse>((resolve, reject) => {
      const workspace = this.getWorkspace()
      if (!workspace) {
        vscode.window.showErrorMessage('DevCycle extension requires an open workspace')
        return
      }
      const cpOptions:cp.ExecOptions = {
        cwd: workspace.uri.fsPath,
      }
      cp.exec(cmd, cpOptions, (err, out) => {
        if (err) {
          return reject({
            output: out,
            error: err,
            code: err.code
          })
        }
        return resolve({
          output: out,
          error: null,
          code: 0
        })
      })
    })
  }

  private getWorkspace() {
    const workspaces = vscode.workspace.workspaceFolders
    if (!workspaces) {
      return undefined
    }
    const activeDocument = vscode.window.activeTextEditor?.document
    return activeDocument
      ? vscode.workspace.getWorkspaceFolder(activeDocument.uri)
      : workspaces[0]
  }
}