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
          await inspectorViewProvider.refresh(folder)
        } else {
          await inspectorViewProvider.refreshAll()
        }
      },
    ),
  )
}