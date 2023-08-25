import * as vscode from 'vscode'
import { COMMAND_CLEAR_VARIABLES } from './constants'

export async function executeClearVariablesCommand(folder?: vscode.WorkspaceFolder) {
  await vscode.commands.executeCommand(COMMAND_CLEAR_VARIABLES, { folder })
}