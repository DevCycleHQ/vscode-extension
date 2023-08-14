import * as vscode from 'vscode'
import { COMMAND_OPEN_LINK } from './constants'

export async function registerOpenLinkCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMAND_OPEN_LINK,
      async (link: string) => {
        vscode.env.openExternal(vscode.Uri.parse(link))
      },
    ),
  )
}