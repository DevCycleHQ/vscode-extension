import * as vscode from 'vscode'
import { COMMAND_REFRESH_ENVIRONMENTS } from './constants'

export async function executeRefreshEnvironmentsCommand(folder?: vscode.WorkspaceFolder) {
  await vscode.commands.executeCommand(COMMAND_REFRESH_ENVIRONMENTS, { folder })
}
