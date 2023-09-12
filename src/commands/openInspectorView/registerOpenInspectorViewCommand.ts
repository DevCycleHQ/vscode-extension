import * as vscode from 'vscode'
import { InspectorViewProvider } from '../../views/inspector'
import { OPEN_INSPECTOR_VIEW } from './constants'

export async function registerOpenInspectorViewCommand(
    context: vscode.ExtensionContext,
    inspectorViewProvider: InspectorViewProvider
    ) {
    context.subscriptions.push(
        vscode.commands.registerCommand(
            OPEN_INSPECTOR_VIEW,
            async ({ buttonType, variableKey, folderUri }: { buttonType: string, variableKey: string, folderUri?: string }) => {
                try {
                    const activeDocumentUri = (folderUri && vscode.Uri.parse(folderUri)) || vscode.window.activeTextEditor?.document.uri
                    const currentFolder = activeDocumentUri ? vscode.workspace.getWorkspaceFolder(activeDocumentUri) : undefined

                    if (!currentFolder) {
                        return
                    }

                    await vscode.commands.executeCommand('devcycle-inspector.focus')
                    inspectorViewProvider.postMessageToWebview({buttonType, type: 'key', value: variableKey, selectedType: 'Variable'})
                } catch (error) {
                    console.error("Failed to open inspector view: ", error)
                }
            },
        ),
    )
}