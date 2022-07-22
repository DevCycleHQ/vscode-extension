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

export type JSONMatch = {
  key: string,
  references: VariableReference[]
}

export type VariableReference = {  
  codeSnippet: CodeSnippet,
  lineNumbers: Range
  fileName: string
  language: string
}

export type CodeSnippet = {
  lineNumbers: Range,
  content: string
}

export type Range = {
  start: number
  end: number
}

export default class DevcycleCLIController {
  public async login() {
    const { code, error, output } = await this.execDvc('login sso --headless')
    if (code === 0) {
      vscode.window.showInformationMessage('Logged into DevCycle')
    } else {
      vscode.window.showInformationMessage(`Login failed ${error?.message}}`)
    }
    const organizations = JSON.parse(output) as string[]
    return this.chooseOrganization(organizations)
  }

  public async chooseOrganization(organizations:string[]) {
    const organization = await vscode.window.showQuickPick(organizations, {
      ignoreFocusOut: true,
      title: 'Select DevCycle Organization'
    })
    const { code, error, output } = await this.execDvc(`org --headless --org=${organization}`)
    if (code === 0) {
      vscode.window.showInformationMessage(`Logged into DevCycle organization ${organization}`)
    } else {
      vscode.window.showInformationMessage(`Organization login failed ${error?.message}}`)
    }
    const projects = JSON.parse(output) as string[]
    return this.chooseProject(projects)
  }

  public async chooseProject(projects:string[]) {
    const project = await vscode.window.showQuickPick(projects, {
      ignoreFocusOut: true,
      title: 'Select DevCycle Project'
    })
    const { code, error } = await this.execDvc(`projects select --headless --project=${project}`)
    if (code === 0) {
      vscode.window.showInformationMessage(`Now using project ${project}`)
    } else {
      vscode.window.showInformationMessage(`Choosing project failed ${error?.message}}`)
    }
  }

  public async status(): Promise<DevCycleStatus> {
    const { output } = await this.execDvc('status --headless')
    return JSON.parse(output) as DevCycleStatus
  }

  public async usages(): Promise<JSONMatch[]> {
    const { output } = await this.execDvc('usages --format=json')
    return JSON.parse(output) as JSONMatch[]
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