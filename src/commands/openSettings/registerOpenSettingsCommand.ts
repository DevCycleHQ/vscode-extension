import * as vscode from 'vscode'
import { OPEN_DVC_SETTINGS } from './constants'

export async function registerOpenSettingsCommand(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand(
            OPEN_DVC_SETTINGS,
            async () => {
                await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:DevCycle.devcycle-feature-flags')
            },
        ),
    )
}