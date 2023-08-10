import * as vscode from 'vscode'
import * as cp from 'child_process'
import * as semver from 'semver'
import { StateManager, KEYS } from '../StateManager'

type CommandResponse = {
  output: string
  error: Error | null
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
  organization?: string
  a0UserId: string
}

export class BaseCLIController {
  folder: vscode.WorkspaceFolder

  constructor(folder: vscode.WorkspaceFolder) {
    this.folder = folder
  }
  
  public async status(): Promise<DevCycleStatus> {
    const { output } = await this.execDvc('status')
    return JSON.parse(output) as DevCycleStatus
  }
  
  public async addAlias(alias: string, variableKey: string) {
    const { code, error } = await this.execDvc(
      `alias add --alias=${alias} --variable=${variableKey}`,
    )
    if (code !== 0) {
      vscode.window.showErrorMessage(`Adding alias failed: ${error?.message}}`)
    }
  }
  
  public async execDvc(cmd: string) {
    const cli =
      vscode.workspace.getConfiguration('devcycle-feature-flags').get('cli') ||
      'dvc'
    const projectId = StateManager.getFolderState(this.folder.name, KEYS.PROJECT_ID)
    let shellCommand = `${cli} ${cmd} --headless --caller vscode_extension`
    if (projectId) shellCommand += ` --project ${projectId}`
    return this.execShell(shellCommand)
  }
  
  private execShell(cmd: string) {
    this.showDebugOutput(`Executing shell command ${cmd}`)
    return new Promise<CommandResponse>((resolve, reject) => {
      const cpOptions: cp.ExecOptions = {
        cwd: this.folder.uri.fsPath,
      }
      cp.exec(cmd, cpOptions, (err, out) => {
        if (err) {
          resolve({
            output: out,
            error: err,
            code: err.code || 0,
          })
        }
        resolve({
          output: out,
          error: null,
          code: 0,
        })
        return
      })
    })
  }
  
  protected showDebugOutput(message: string) {
    const debug = vscode.workspace
      .getConfiguration('devcycle-feature-flags')
      .get('debug')
    if (debug) {
      vscode.window.showInformationMessage(message)
    }
  }

  public async isCliInstalled() {
    const { error } = await this.execDvc('--version')
    return !error
  }

  public requiredPackageVersion = '5.2.1'

  public async isCliMinVersion() {
    const { error, output } = await this.execDvc('--version')
    if (error) {
      console.error(`Error checking package version: ${error.message}`);
      return false
    }
    const regex = /\/(\d+\.\d+\.\d+)\b/;
    const match = output.match(regex);

    if (match) {
      const cliVersion = match[1]
      return cliVersion && semver.gte(cliVersion, this.requiredPackageVersion)
    } else {
      return false
    }
    
  }
}
