import * as vscode from 'vscode'
import { AuthCLIController, getOrganizationId } from '../../cli'
import { trackRudderstackEvent } from '../../RudderStackService'
import { COMMAND_INIT } from './constants'

export async function registerInitCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_INIT, async () => {
      vscode.workspace.workspaceFolders?.forEach(async (folder) => {
        const orgId = getOrganizationId(folder)
        trackRudderstackEvent('Init Command Ran', orgId)
        const cli = new AuthCLIController(folder)
        await cli.init()
      })
    }),
  )
}