import * as vscode from 'vscode'
import { AuthCLIController } from '../cli'
import { executeRefreshAllCommand } from '../commands'

export async function loginAndRefreshAll() {
  const { workspaceFolders = [] } = vscode.workspace
  await loginAndRefresh([...workspaceFolders])
}

export async function loginAndRefresh(folders: vscode.WorkspaceFolder[]) {
  const foldersLoggedIn = []

  for (const folder of folders) {
    try {
      const cli = new AuthCLIController(folder)
      await cli.login()
      foldersLoggedIn.push(folder)
    } catch (e) {}
  }
  await Promise.all(
    foldersLoggedIn.map(executeRefreshAllCommand)
  )

  if (foldersLoggedIn.length > 0) {
    await vscode.commands.executeCommand(
      'setContext',
      'devcycle-feature-flags.hasCredentialsAndProject',
      true,
    )
  }
}
