
import * as vscode from 'vscode'
import { HomeViewProvider } from './HomeViewProvider'

export async function registerHomeViewProvider(context: vscode.ExtensionContext) {
    const homeViewProvider = new HomeViewProvider(context.extensionUri)
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
        'devcycle-home',
        homeViewProvider
        ),
    )
    
    return homeViewProvider
}
