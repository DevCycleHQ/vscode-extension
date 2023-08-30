import * as vscode from 'vscode'
import { COMMAND_REFRESH_INSPECTOR } from './constants'
import { InspectorViewProvider } from '../../views/inspector'

export async function registerRefreshInspectorCommand(
  context: vscode.ExtensionContext,
  inspectorViewProvider: InspectorViewProvider
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMAND_REFRESH_INSPECTOR,
      async ({ folder }: { folder?: vscode.WorkspaceFolder } = {}) => {
        await inspectorViewProvider.refreshAll()
      },
    ),
  )
}