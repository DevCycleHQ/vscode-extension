import * as vscode from 'vscode'
import { COMMAND_SORT_USAGES } from './constants'

export async function executeSortUsagesCommand(folder?: vscode.WorkspaceFolder) {
  await vscode.commands.executeCommand(COMMAND_SORT_USAGES, folder)
}