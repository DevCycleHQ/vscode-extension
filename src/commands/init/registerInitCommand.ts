import * as vscode from 'vscode'
import { AuthCLIController } from '../../cli'
import { trackRudderstackEvent } from '../../RudderStackService'
import { COMMAND_INIT } from './constants'
import { KEYS, StateManager } from '../../StateManager'

export async function registerInitCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_INIT, async () => {
      vscode.workspace.workspaceFolders?.forEach(async (folder) => {
        const org = StateManager.getFolderState(folder.name, KEYS.ORGANIZATION)
        if (org) {
          trackRudderstackEvent('Init Command Ran', org?.name)
          const cli = new AuthCLIController(folder)
          await cli.init(org)
        }
      })
    }),
  )
}