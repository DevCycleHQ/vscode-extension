
import * as vscode from 'vscode'
import { InspectorViewProvider } from './InspectorViewProvider'

export async function registerInspectorViewProvider(context: vscode.ExtensionContext) {
    const inspectorViewProvider = new InspectorViewProvider(context.extensionUri)
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'devcycle-inspector',
            inspectorViewProvider,
        ),
    )
 
    return inspectorViewProvider
}
