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
const CACHE_TIME = 15000

export default class DevcycleCLIController {
  public static statusBarItem = vscode.window.createStatusBarItem(STATUS_BAR_ITEM)
  public static repoConfigured:boolean = false
  public static loggedIn:boolean = false

  public static async init() {
    this.showBusyMessage('Initializing DevCycle')
    const { code, error, output } = await this.execDvc('repo init')
    if (code === 0) {
      DevcycleCLIController.loggedIn = true
      await vscode.commands.executeCommand('setContext', 'devcycle-featureflags.loggedIn', true)
    } else {
      vscode.window.showErrorMessage(`Login failed ${error?.message}}`)
    }
    this.hideStatus()
    const organizations = JSON.parse(output) as string[]
    await this.chooseOrganization(organizations)
    if(DevcycleCLIController.repoConfigured) {
      await vscode.commands.executeCommand('devcycle-featureflags.refresh-usages')
      vscode.window.showInformationMessage('DevCycle Configured')
    }
  }

  public static async login() {
    this.showBusyMessage('Logging into DevCycle')
    const { code, error } = await this.execDvc('login again')
    if (code === 0) {
      this.loggedIn = true
      await vscode.commands.executeCommand('setContext', 'devcycle-featureflags.loggedIn', true)
      vscode.window.showInformationMessage('Logged in to DevCycle')
    } else {
      vscode.window.showErrorMessage(`Login failed ${error?.message}}`)
    }
    this.hideStatus()
  }

  public static async chooseOrganization(organizations:string[]) {
    const organization = await vscode.window.showQuickPick(organizations, {
      ignoreFocusOut: true,
      title: 'Select DevCycle Organization'
    })
    this.showBusyMessage('Logging into DevCycle organization')
    const { code, error, output } = await this.execDvc(`org --org=${organization}`)
    if (code !== 0) {
      vscode.window.showErrorMessage(`Organization login failed ${error?.message}}`)
    }
    this.hideStatus()
    const projects = JSON.parse(output) as string[]
    return this.chooseProject(projects)
  }

  public static async chooseProject(projects:string[]) {
    const project = await vscode.window.showQuickPick(projects, {
      ignoreFocusOut: true,
      title: 'Select DevCycle Project'
    })
    const { code, error } = await this.execDvc(`projects select --project=${project}`)
    if (code === 0) {
      this.repoConfigured = true
      await vscode.commands.executeCommand('setContext', 'devcycle-featureflags.repoConfigured', true)
    } else {
      vscode.window.showErrorMessage(`Choosing project failed ${error?.message}}`)
    }
  }

  public static async status(): Promise<DevCycleStatus> {
    const { output } = await this.execDvc('status')
    return JSON.parse(output) as DevCycleStatus
  }

  public static async usages(): Promise<JSONMatch[]> {
    DevcycleCLIController.showBusyMessage('Finding Devcycle code usages')
    const { output } = await DevcycleCLIController.execDvc('usages --format=json')
    const matches = JSON.parse(output) as JSONMatch[]
    DevcycleCLIController.hideStatus()
    return matches
  }

  public static async logout() {
    const { code, error } = await this.execDvc('logout')
    if (code === 0) {
      this.loggedIn = false
      await vscode.commands.executeCommand('setContext', 'devcycle-featureflags.loggedIn', false)
      vscode.window.showInformationMessage('Logged out of DevCycle')
    } else {
      vscode.window.showInformationMessage(`Logout failed ${error?.message}}`)
    }
  }

  public static async addAlias(alias:string, variableKey:string) {
    const { code, error } = await this.execDvc(`alias add --alias=${alias} --variable=${variableKey}`)
    if (code !== 0) {
      vscode.window.showErrorMessage(`Adding alias failed: ${error?.message}}`)
    }
  }

  private static showBusyMessage(message:string) {
    DevcycleCLIController.statusBarItem.text = `$(loading~spin) ${message}...`
    DevcycleCLIController.statusBarItem.tooltip = `${message}...`
    DevcycleCLIController.statusBarItem.show()
  }

  private static hideStatus() {
    DevcycleCLIController.statusBarItem.hide()
  }

  protected static execDvc(cmd: string) {
    const cli = vscode.workspace.getConfiguration('devcycle-featureflags').get('cli') || 'dvc'
    const shellCommand = `${cli} ${cmd} --headless`
    return this.execShell(shellCommand)
  }

  private static execShell(cmd: string) {
    this.showDebugOutput(`Executing shell command ${cmd}`)
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
          resolve({
            output: out,
            error: err,
            code: err.code || 0
          })
        }
        resolve({
          output: out,
          error: null,
          code: 0
        })
        return
      })
    })
  }

  private static getWorkspace() {
    const workspaces = vscode.workspace.workspaceFolders
    if (!workspaces) {
      return undefined
    }
    const activeDocument = vscode.window.activeTextEditor?.document
    return activeDocument
      ? vscode.workspace.getWorkspaceFolder(activeDocument.uri)
      : workspaces[0]
  }

  private static showDebugOutput(message:string) {
    const debug = vscode.workspace.getConfiguration('devcycle-featureflags').get('debug')
    if(debug) {
      vscode.window.showInformationMessage(message)
    }
  }

  private static isRecent(date:Date) {
    const diff = Date.now() - date.getTime()
    return (diff < CACHE_TIME)
  }

}