import * as vscode from 'vscode'
import { AuthCLIController } from '../cli'
import { executeRefreshAllCommand } from '../commands'
import utils from '.'

export async function loginAndRefreshAll(headlessLogin = false) {
  const { workspaceFolders = [] } = vscode.workspace
  await loginAndRefresh([...workspaceFolders], headlessLogin)
}

export async function loginAndRefresh(
  folders: vscode.WorkspaceFolder[],
  headlessLogin = false,
) {
  utils.showDebugOutput('Logging in and refreshing all folders')
  const foldersToRefresh = []

  for (const folder of folders) {
    const cli = new AuthCLIController(folder, headlessLogin)
    try {
      await cli.login()
      foldersToRefresh.push(folder)
    } catch (e) {}
  }
  utils.showDebugOutput(
    `Logged in, refreshing all ${foldersToRefresh.length} folders`,
  )
  await Promise.all(foldersToRefresh.map(executeRefreshAllCommand))
  const loggedInFolders = utils.getLoggedInFolders()
  await vscode.commands.executeCommand(
    'setContext',
    'devcycle-feature-flags.hasCredentialsAndProject',
    loggedInFolders.length > 0,
  )

  utils.showDebugOutput(
    `Logged in and refreshed ${loggedInFolders.length} folders`,
  )
}
