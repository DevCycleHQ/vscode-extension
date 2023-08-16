import * as vscode from 'vscode'

export const setUpWorkspaceStartupView = () => {
    const shouldShowWorkspaceView = !vscode.workspace.workspaceFolders

    vscode.commands.executeCommand(
        'setContext',
        'devcycle-feature-flags.shouldShowWorkspaceView',
        shouldShowWorkspaceView,
    )

    return shouldShowWorkspaceView
}