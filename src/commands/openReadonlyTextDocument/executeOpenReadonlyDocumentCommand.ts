import * as vscode from 'vscode'
import { OPEN_READONLY } from './constants'

export async function executeOpenReadonlyDocumentCommand(value: string) {
    await vscode.commands.executeCommand(OPEN_READONLY, { value })
}
