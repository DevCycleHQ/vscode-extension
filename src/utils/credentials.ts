import * as vscode from 'vscode'
import { status } from '../cli'
import { KEYS, StateManager } from '../StateManager'
import { loadRepoConfig } from './loadRepoConfig'

export async function autoLoginIfHaveCredentials() {
  const repoConfig = await loadRepoConfig()
  const projectId = repoConfig.project || await StateManager.getState(KEYS.PROJECT_ID)
  const organization = repoConfig.org || await StateManager.getState(KEYS.ORGANIZATION)

  const { hasAccessToken } = await status()
  const hasAllCredentials = Boolean(hasAccessToken && organization && projectId)

  await vscode.commands.executeCommand(
    'setContext',
    'devcycle-feature-flags.hasCredentialsAndProject',
    hasAllCredentials,
  )

  return hasAllCredentials
}
