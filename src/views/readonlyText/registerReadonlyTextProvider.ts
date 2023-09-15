import * as vscode from 'vscode'
import { format } from "prettier"

export function registerReadonlyTextProvider(context: vscode.ExtensionContext, scheme: string) {
    const textProvider = new class implements vscode.TextDocumentContentProvider {

        onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>()
        onDidChange = this.onDidChangeEmitter.event

        async provideTextDocumentContent(uri: vscode.Uri) {
            const formattedText = await format(uri.path, { parser: 'json' })
            return formattedText
        }
    }

    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(scheme, textProvider))
}