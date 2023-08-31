import * as vscode from 'vscode'

export const checkForWorkspaceFolders = () => {
    const hasWorkspaceFolders = Boolean(vscode.workspace.workspaceFolders?.length)

    vscode.commands.executeCommand(
        'setContext',
        'devcycle-feature-flags.hasWorkspaceFolders',
        hasWorkspaceFolders,
    )

    return hasWorkspaceFolders
}