import * as vscode from 'vscode'
import { COMMAND_REFRESH_ALL } from './constants'
import { StateManager } from '../../StateManager'
import { UsagesTreeProvider } from '../../views/usages'
import { EnvironmentsTreeProvider } from '../../views/environments'

export async function registerRefreshAllCommand(
  context: vscode.ExtensionContext,
  providers: (UsagesTreeProvider | EnvironmentsTreeProvider)[]
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMAND_REFRESH_ALL,
      async ({ folder }: { folder?: vscode.WorkspaceFolder } = {}) => {
        if (folder) {
          StateManager.clearFolderState(folder.name)
        } else {
          StateManager.clearState()
        }
        await Promise.all(providers.map(
          provider => folder ? provider.refresh(folder) : provider.refreshAll()
        ))
      },
    ),
  )
}
