import * as vscode from 'vscode'
import { OPEN_READONLY, TEXT_PROVIDER_SCHEME } from './constants'

export async function registerOpenReadonlyDocumentCommand(context: vscode.ExtensionContext) {

    context.subscriptions.push(vscode.commands.registerCommand(
        OPEN_READONLY,
        async ({ value }: { value: string }) => {
            if (value) {
                const uri = vscode.Uri.parse(`${TEXT_PROVIDER_SCHEME}:` + value)
                const doc = await vscode.workspace.openTextDocument(uri)
                await vscode.window.showTextDocument(doc)
            }
        }))
}