import * as vscode from 'vscode'
import { AuthCLIController, getOrganizationId } from '../../cli'
import { trackRudderstackEvent } from '../../RudderStackService'
import { COMMAND_LOGOUT } from './constants'
import { StateManager } from '../../StateManager'

export async function registerLogoutCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMAND_LOGOUT,
      async () => {
        await Promise.all([
          StateManager.clearState(),
          vscode.commands.executeCommand(
            'setContext',
            'devcycle-feature-flags.hasCredentialsAndProject',
            false,
          ),
        ])
        const [folder] = vscode.workspace.workspaceFolders || []
        if (folder) {
          const cli = new AuthCLIController(folder)
          await cli.logout()
        }
        const orgId = getOrganizationId(folder)
        trackRudderstackEvent('Logout Command Ran', orgId)
      },
    ),
  )
}