import * as vscode from 'vscode'
import { BaseCLIController } from '../cli'
import { KEYS, StateManager } from '../StateManager'
import { loadRepoConfig } from './loadRepoConfig'

export async function autoLoginIfHaveCredentials(folder: vscode.WorkspaceFolder) {
  const repoConfig = await loadRepoConfig(folder)
  const projectId = repoConfig.project || await StateManager.getFolderState(folder.name, KEYS.PROJECT_ID)
  const organization = repoConfig.org || await StateManager.getFolderState(folder.name, KEYS.ORGANIZATION)

  const cli = new BaseCLIController(folder)
  const { hasAccessToken } = await cli.status()
  const hasAllCredentials = Boolean(hasAccessToken && organization && projectId)

  await vscode.commands.executeCommand(
    'setContext',
    'devcycle-feature-flags.hasCredentialsAndProject',
    hasAllCredentials,
  )

  return hasAllCredentials
}
