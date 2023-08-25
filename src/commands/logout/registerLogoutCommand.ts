import * as vscode from 'vscode'
import { COMMAND_LOGOUT } from './constants'
import utils from '../../utils'

export async function registerLogoutCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMAND_LOGOUT,
      async () => {
        await utils.logout()
      },
    ),
  )
}