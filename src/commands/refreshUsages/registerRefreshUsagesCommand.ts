import * as vscode from 'vscode'
import { COMMAND_REFRESH_USAGES } from './constants'
import { KEYS, StateManager } from '../../StateManager'
import { UsagesTreeProvider } from '../../views/usages'

export async function registerRefreshUsagesCommand(
  context: vscode.ExtensionContext,
  usagesDataProvider: UsagesTreeProvider
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMAND_REFRESH_USAGES,
      async ({ folder }: { folder?: vscode.WorkspaceFolder } = {}) => {
        if (folder) {
          StateManager.setFolderState(folder.name, KEYS.CODE_USAGE_KEYS, undefined)
          await usagesDataProvider.refresh(folder)
        } else {
          vscode.workspace.workspaceFolders?.forEach(({ name }) => {
            StateManager.setFolderState(name, KEYS.CODE_USAGE_KEYS, undefined)
          })
          await usagesDataProvider.refreshAll()
        }
      },
    ),
  )
}