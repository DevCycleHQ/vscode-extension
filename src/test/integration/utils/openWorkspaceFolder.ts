import { browser, $ } from '@wdio/globals'
import { Key } from 'webdriverio'

export const WORKSPACE_FOLDER_PATH = `${__dirname}/../../../../src/test/fixtures/testWorkspace`

export const openWorkspaceFolder = async () => {
    await browser.executeWorkbench((vscode: any) => {
        vscode.commands.executeCommand('workbench.action.files.openFolder')
    })
    await browser.pause(500)

    await populateFolderPrompt()
}

export const populateFolderPrompt = async () => {
    await browser.keys([Key.Ctrl, 'a', Key.Delete])
    await browser.keys([WORKSPACE_FOLDER_PATH])
    await browser.keys([Key.Enter])
}
