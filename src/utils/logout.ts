import * as vscode from 'vscode'
import { KEYS, StateManager } from '../StateManager'
import { AuthCLIController, getOrganizationId } from '../cli'
import { trackRudderstackEvent } from '../RudderStackService'

export async function logout() {
  await Promise.all([
    StateManager.clearState(),
    StateManager.setWorkspaceState(KEYS.AUTH0_USER_ID, undefined),
    vscode.commands.executeCommand(
      'setContext',
      'devcycle-feature-flags.hasCredentialsAndProject',
      false,
    ),
  ])
  const folders = vscode.workspace.workspaceFolders || []
  for (const folder of folders) {
    StateManager.setFolderState(folder.name, KEYS.PROJECT_ID, undefined)
    StateManager.setFolderState(folder.name, KEYS.ORGANIZATION, undefined)

    const cli = new AuthCLIController(folder)
    await cli.logout()

    const orgId = getOrganizationId(folder)
    trackRudderstackEvent('Logout Command Ran', orgId)
  }
}