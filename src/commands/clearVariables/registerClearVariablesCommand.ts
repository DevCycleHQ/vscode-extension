import * as vscode from 'vscode'
import { COMMAND_CLEAR_VARIABLES } from './constants'
import { KEYS, StateManager } from '../../StateManager'
import { UsagesTreeProvider } from '../../views/usages'

export async function registerClearVariablesCommand(
  context: vscode.ExtensionContext,
  usagesDataProvider: UsagesTreeProvider
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMAND_CLEAR_VARIABLES,
      async ({ folder }: { folder: vscode.WorkspaceFolder }) => {
        await StateManager.setFolderState(folder.name, KEYS.VARIABLES, undefined)
        await usagesDataProvider.clearVariables(folder)
      },
    ),
  )
}