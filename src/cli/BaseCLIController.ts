import * as vscode from 'vscode'
import * as cp from 'child_process'
import { StateManager, KEYS } from '../StateManager'
import cliUtils from './utils'

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
    const { output, error } = await this.execDvc('status')
    if (error) throw error
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
    const dvc = await cliUtils.getCliExec()

    const projectId = StateManager.getFolderState(this.folder.name, KEYS.PROJECT_ID)
    let shellCommand = `${dvc} ${cmd} --headless --caller vscode_extension`
    if (projectId) shellCommand += ` --project ${projectId}`
    return cliUtils.execShell(shellCommand, this.folder.uri.fsPath)
  }
}
