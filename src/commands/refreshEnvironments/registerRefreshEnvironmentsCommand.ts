import * as vscode from 'vscode'
import { COMMAND_REFRESH_ENVIRONMENTS } from './constants'
import { KEYS, StateManager } from '../../StateManager'
import { EnvironmentsTreeProvider } from '../../views/environments'

export async function registerRefreshEnvironmentsCommand(
  context: vscode.ExtensionContext,
  dataProvider: EnvironmentsTreeProvider
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMAND_REFRESH_ENVIRONMENTS,
      async ({ folder }: { folder?: vscode.WorkspaceFolder } = {}) => {
        if (folder) {
          StateManager.setFolderState(folder.name, KEYS.ENVIRONMENTS, undefined)
          await dataProvider.refresh(folder)
        } else {
          vscode.workspace.workspaceFolders?.forEach(({ name }) => {
            StateManager.setFolderState(name, KEYS.ENVIRONMENTS, undefined)
          })
          await dataProvider.refreshAll()
        }
      },
    ),
  )
}
