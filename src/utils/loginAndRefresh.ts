import * as vscode from 'vscode'
import { AuthCLIController } from '../cli'
import { executeRefreshAllCommand } from '../commands'

export async function loginAndRefreshAll(headlessLogin = false) {
  const { workspaceFolders = [] } = vscode.workspace
  await loginAndRefresh([...workspaceFolders], headlessLogin)
}

export async function loginAndRefresh(
  folders: vscode.WorkspaceFolder[],
  headlessLogin = false,
) {
  const foldersLoggedIn = []

  for (const folder of folders) {
    const cli = new AuthCLIController(folder, headlessLogin)
    try {
      await cli.login()
      foldersLoggedIn.push(folder)
    } catch (e) {}
  }
  await Promise.all(foldersLoggedIn.map(executeRefreshAllCommand))

  await vscode.commands.executeCommand(
    'setContext',
    'devcycle-feature-flags.hasCredentialsAndProject',
    foldersLoggedIn.length > 0,
  )
}
