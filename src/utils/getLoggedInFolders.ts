import * as vscode from 'vscode'
import { KEYS, StateManager } from '../StateManager'

export const getLoggedInFolders = () => {
  const workspaceFolders = vscode.workspace.workspaceFolders || []
  return workspaceFolders.reduce((acc, folder) => {
    const loggedIn =
      StateManager.getFolderState(folder.name, KEYS.LOGGED_IN) ?? false
    if (loggedIn) {
      acc.push(folder)
    }
    return acc
  }, [] as vscode.WorkspaceFolder[])
}
