import * as vscode from 'vscode'
import { AuthCLIController } from '../cli'
import { executeRefreshAllCommand } from '../commands'

export async function loginAndRefresh() {
  const folders = vscode.workspace.workspaceFolders || []
  for (const folder of folders) {
    const cli = new AuthCLIController(folder)
    await cli.login()
  }
  await executeRefreshAllCommand()

  await vscode.commands.executeCommand(
    'setContext',
    'devcycle-feature-flags.hasCredentialsAndProject',
    true,
  )
}
