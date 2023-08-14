import * as vscode from 'vscode'
import { COMMAND_SHOW_REFERENCE } from './constants'

export async function registerShowReferenceCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMAND_SHOW_REFERENCE,
      async (filePath: string, start: number, end: number) => {
        const document = await vscode.workspace.openTextDocument(filePath)
        await vscode.window.showTextDocument(document)
        const editor = vscode.window.activeTextEditor
        if (!editor) { throw new Error('No active text editor') }
        editor.selection = new vscode.Selection(start - 1, 0, end, 0)
        editor.revealRange(
          editor.selection,
          vscode.TextEditorRevealType.InCenterIfOutsideViewport,
        )
      },
    ),
  )
}