import * as vscode from 'vscode'
import { BaseCLIController } from '../cli'
import { minimumCliVersion } from '../constants'
export const setUpCliStartupView = async () => {
    const [folder] = vscode.workspace.workspaceFolders || []
    const cli = new BaseCLIController(folder)
    const isInstalled = await cli.isCliInstalled()
    const isMinVersion = await cli.isCliMinVersion()
    const shouldShowCliStartUpView = !(isInstalled && isMinVersion)
    vscode.commands.executeCommand(
        'setContext',
        'devcycle-feature-flags.shouldShowCliView',
        shouldShowCliStartUpView,
    )

    if (!isInstalled) {
        vscode.window.showErrorMessage(
            'In order to use DevCycle extension, please install DevCycle CLI.'
        )
    } else if (!isMinVersion) {
        vscode.window.showErrorMessage(
            `Your installed version of @devcycle/cli is outdated. Please update to version ${minimumCliVersion} or later.`
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