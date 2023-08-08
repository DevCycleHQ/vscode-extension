import * as vscode from 'vscode'
import { hasWorkSpace, isCliInstalled } from '../cli'

export const setUpCliStartupView = async () => {
    const shouldShowCliStartUpView = !(await isCliInstalled())

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
    const shouldShowWorkspaceView = !hasWorkSpace()

    vscode.commands.executeCommand(
        'setContext',
        'devcycle-feature-flags.shouldShowWorkspaceView',
        shouldShowWorkspaceView,
    )

    return shouldShowWorkspaceView
}