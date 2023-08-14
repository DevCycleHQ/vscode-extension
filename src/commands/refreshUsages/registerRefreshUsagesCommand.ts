import * as vscode from 'vscode'
import { COMMAND_REFRESH_USAGES } from './constants'
import { StateManager } from '../../StateManager'
import { UsagesTreeProvider } from '../../views/usages'

export async function registerRefreshUsagesCommand(
  context: vscode.ExtensionContext,
  usagesDataProvider: UsagesTreeProvider
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMAND_REFRESH_USAGES,
      async (folder?: vscode.WorkspaceFolder) => {
        if (folder) {
          StateManager.clearFolderState(folder.name)
          await usagesDataProvider.refresh(folder)
        } else {
          StateManager.clearState()
          await usagesDataProvider.refreshAll()
        }
      },
    ),
  )
}