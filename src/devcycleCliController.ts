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
  organization?: {
    id: string,
    name: string,
    display_name: string
  }
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

const STATUS_BAR_ITEM:string = 'devcycle-featureflags'

export default class DevcycleCLIController {
  private statusBarItem:vscode.StatusBarItem
  private repoConfigured:boolean = false

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(STATUS_BAR_ITEM)
    this.statusBarItem.name = "DevCycle Status"
  }

  public async init() {
    this.showBusyMessage('Initializing DevCycle')
    const { code, error, output } = await this.execDvc('repo init --headless')
    if (code === 0) {
      vscode.commands.executeCommand('setContext', 'devcycle-featureflags.loggedIn', true)
    } else {
      vscode.window.showErrorMessage(`Login failed ${error?.message}}`)
    }
    this.hideStatus()
    const organizations = JSON.parse(output) as string[]
    await this.chooseOrganization(organizations)
    if(this.repoConfigured) {
      vscode.window.showInformationMessage('DevCycle Configured')
      vscode.commands.executeCommand('devcycle-featureflags.refresh-usages')
    }
  }

  public async login() {
    this.showBusyMessage('Logging into DevCycle')
    const { code, error, output } = await this.execDvc('login again --headless')
    if (code === 0) {
      vscode.commands.executeCommand('setContext', 'devcycle-featureflags.loggedIn', true)
    } else {
      vscode.window.showErrorMessage(`Login failed ${error?.message}}`)
    }
    this.hideStatus()
  }

  public async chooseOrganization(organizations:string[]) {
    const organization = await vscode.window.showQuickPick(organizations, {
      ignoreFocusOut: true,
      title: 'Select DevCycle Organization'
    })
    this.showBusyMessage('Logging into DevCycle organization')
    const { code, error, output } = await this.execDvc(`org --headless --org=${organization}`)
    if (code !== 0) {
      vscode.window.showErrorMessage(`Organization login failed ${error?.message}}`)
    }
    this.hideStatus()
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
      vscode.commands.executeCommand('setContext', 'devcycle-featureflags.repoConfigured', true)
      this.repoConfigured = true
    } else {
      vscode.window.showErrorMessage(`Choosing project failed ${error?.message}}`)
    }
  }

  public async status(): Promise<DevCycleStatus> {
    const { output } = await this.execDvc('status --headless')
    return JSON.parse(output) as DevCycleStatus
  }

  public async usages(): Promise<JSONMatch[]> {
    this.showBusyMessage('Finding Devcycle code usages')
    const { output } = await this.execDvc('usages --format=json')
    const matches = JSON.parse(output) as JSONMatch[]
    this.hideStatus()
    return matches
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

  private showBusyMessage(message:string) {
    this.statusBarItem.text = `$(loading~spin) ${message}...`
    this.statusBarItem.tooltip = `${message}...`
    this.statusBarItem.show()
  }

  private hideStatus() {
    this.statusBarItem.hide()
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