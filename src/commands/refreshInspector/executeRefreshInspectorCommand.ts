import * as vscode from 'vscode'
import { COMMAND_REFRESH_INSPECTOR } from './constants'

export async function executeRefreshInspectorCommand(folder?: vscode.WorkspaceFolder) {
  await vscode.commands.executeCommand(COMMAND_REFRESH_INSPECTOR, { folder })
}