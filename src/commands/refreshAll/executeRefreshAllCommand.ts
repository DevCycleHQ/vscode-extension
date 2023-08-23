import * as vscode from 'vscode'
import { COMMAND_REFRESH_ALL } from './constants'

export async function executeRefreshAllCommand(folder?: vscode.WorkspaceFolder) {
  await vscode.commands.executeCommand(COMMAND_REFRESH_ALL, { folder })
}
