import * as vscode from 'vscode'
import { COMMAND_REFRESH_USAGES } from './constants'

export async function executeRefreshUsagesCommand(folder?: vscode.WorkspaceFolder) {
  await vscode.commands.executeCommand(COMMAND_REFRESH_USAGES, folder)
}