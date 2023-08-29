import { browser, expect, $ } from '@wdio/globals'

describe('VS Code Extension Testing', () => {
    before(async () => {
        await browser.executeWorkbench((vscode: any) => {
            // Enable all installed extensions and reload
            vscode.commands.executeCommand('workbench.extensions.action.enableAll')
            vscode.commands.executeCommand('workbench.action.reloadWindow')
        })
    })

    it('loads VSCoce development window', async () => {
        const workbench = await browser.getWorkbench()
        const title = await workbench.getTitleBar().getTitle()
        expect(title).toContain('[Extension Development Host]')
    })

    it('DevCycle sidebar action exists', async () => {
        const dvcSidebarAction = await $('.monaco-action-bar .action-item[aria-label="DevCycle"]')
        expect(dvcSidebarAction).not.toHaveProperty('error')
    })
})

