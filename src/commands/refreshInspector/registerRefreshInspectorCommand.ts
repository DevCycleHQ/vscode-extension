import * as vscode from 'vscode'
import { COMMAND_REFRESH_INSPECTOR } from './constants'
import { KEYS, StateManager } from '../../StateManager'
import { InspectorViewProvider } from '../../views/inspector'

export async function registerRefreshInspectorCommand(
  context: vscode.ExtensionContext,
  inspectorViewProvider: InspectorViewProvider
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMAND_REFRESH_INSPECTOR,
      async ({ folder }: { folder?: vscode.WorkspaceFolder } = {}) => {
        if (folder) {
          StateManager.setFolderState(folder.name, KEYS.FEATURES, undefined)
          StateManager.setFolderState(folder.name, KEYS.VARIABLES, undefined)
          await inspectorViewProvider.refresh(folder)
        } else {
          vscode.workspace.workspaceFolders?.forEach(({ name }) => {
            StateManager.setFolderState(name, KEYS.FEATURES, undefined)
            StateManager.setFolderState(name, KEYS.VARIABLES, undefined)
          })
          await inspectorViewProvider.refreshAll()
        }
      },
    ),
  )
}