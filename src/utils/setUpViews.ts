import * as vscode from 'vscode'
import { BaseCLIController } from '../cli'

export const setUpCliStartupView = async () => {
    const [folder] = vscode.workspace.workspaceFolders || []
    const cli = new BaseCLIController(folder)
    const shouldShowCliStartUpView = !(await cli.isCliInstalled())

    vscode.commands.executeCommand(
        'setContext',
        'devcycle-feature-flags.shouldShowCliView',
        shouldShowCliStartUpView,
    )

    if (shouldShowCliStartUpView) {
        vscode.window.showErrorMessage(
            'In order to use DevCycle extension, please install Devcycle CLI.'
        )
    }

    return shouldShowCliStartUpView
}

export const setUpWorkspaceStartupView = () => {
    const shouldShowWorkspaceView = !vscode.workspace.workspaceFolders

    vscode.commands.executeCommand(
        'setContext',
        'devcycle-feature-flags.shouldShowWorkspaceView',
        shouldShowWorkspaceView,
    )

    return shouldShowWorkspaceView
}