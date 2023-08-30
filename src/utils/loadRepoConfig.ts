import * as vscode from 'vscode'
import yaml from 'js-yaml'
import { BaseCLIController } from '../cli'
import { KEYS, StateManager } from '../StateManager'

export type RepoConfig = {
  project?: string | null
  org?: {
    id: string
    name: string
    display_name: string
  }
  codeInsights?: {
    variableAliases?: Record<string, string>
  }
}

export const loadRepoConfig = async (folder: vscode.WorkspaceFolder): Promise<RepoConfig> => {
  const rootPath = folder.uri.fsPath
  let configFileJson: RepoConfig = {}
  try {
    const cli = new BaseCLIController(folder)
    const { repoConfigPath } = await cli.status()
    const configFileByteArray = await vscode.workspace.fs.readFile(
      vscode.Uri.parse(`file:${rootPath}/${repoConfigPath}`)
    )
    const configFileString = new TextDecoder().decode(configFileByteArray)
    configFileJson = yaml.load(configFileString) as RepoConfig
    const { project, org } = configFileJson
    if (project) StateManager.setFolderState(folder.name, KEYS.PROJECT_ID, project)
    if (org) StateManager.setFolderState(folder.name, KEYS.ORGANIZATION, org)
  } catch (e) {}
  StateManager.setFolderState(folder.name, KEYS.REPO_CONFIG, configFileJson)
  return configFileJson
}

export const getRepoConfig = async (folder: vscode.WorkspaceFolder) => {
  const storedConfig = StateManager.getFolderState(folder.name, KEYS.REPO_CONFIG)
  if (storedConfig) {
    return storedConfig
  }
  return await loadRepoConfig(folder)
}
