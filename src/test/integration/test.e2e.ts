import { browser, expect, $ } from '@wdio/globals'
import { clickSidebarAction, switchToWebview, populateFolderPrompt } from './utils'

describe('DevCycle Extension E2E', () => {
    it('displays startup view when a folder is not opened', async () => {
        await clickSidebarAction('DevCycle')
        await switchToWebview('#devcycle-startup')

        await browser.waitUntil(async () => {
            const body = await $('body')
            const bodyText = await body.getText()
            return bodyText.includes('In order to use DevCycle features, open a folder')
        }, { timeoutMsg: 'DevCycle startup view did not load' })
    })

    it('displays login view after opening folder', async () => {
        const openFolderBtn = await $('button=Open folder')
        await openFolderBtn.click()
        await browser.pause(500)

        await populateFolderPrompt()
        
        await clickSidebarAction('DevCycle')
        await switchToWebview('#devcycle-login')

        await browser.waitUntil(async () => {
            const body = await $('body')
            const bodyText = await body.getText()
            return bodyText.includes('Login to DevCycle')
        }, { timeoutMsg: 'DevCycle login view did not load' })
    })

    it('displays expected views after login', async () => {
        const loginBtn = await $('button=Login')
        await loginBtn.click()

        const workbench = await browser.getWorkbench()
        const sidebar = workbench.getSideBar()

        const sections = await sidebar.getContent().getSections()

        expect(sections).toHaveLength(3)
        const [usagesSection, environmentsSection, resourcesSection] = sections

        expect(await usagesSection.getTitle()).toEqual('Variable Usages')
        expect(await environmentsSection.getTitle()).toEqual('Environments & Keys')
        expect(await resourcesSection.getTitle()).toEqual('DevCycle Resources')
    })
})

