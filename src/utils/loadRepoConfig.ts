import * as vscode from 'vscode'
import yaml from 'js-yaml'
import { status } from '../cli/index'
import { KEYS, StateManager } from '../StateManager'

export type RepoConfig = {
  project?: string
  org?: {
    id: string
    name: string
    display_name: string
  }
  codeInsights?: {
    variableAliases?: Record<string, string>
  }
}

export const loadRepoConfig = async (): Promise<RepoConfig> => {
  const rootPath = StateManager.getState(KEYS.ROOT_PATH)
  if (rootPath) {
    try {
      const { repoConfigPath } = await status()
      const configFileByteArray = await vscode.workspace.fs.readFile(
        vscode.Uri.parse(`file:${rootPath}/${repoConfigPath}`)
      )
      const configFileString = new TextDecoder().decode(configFileByteArray)
      const configFileJson = yaml.load(configFileString) as RepoConfig
      StateManager.setState(KEYS.REPO_CONFIG, configFileJson)
      return configFileJson
    } catch (e) {}
  }
  StateManager.setState(KEYS.REPO_CONFIG, {})
  return {}
}