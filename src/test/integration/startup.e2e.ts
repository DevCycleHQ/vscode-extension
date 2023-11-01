import { browser, $ } from '@wdio/globals'
import { clickSidebarAction, switchToWebview, populateFolderPrompt } from './utils'

describe('Startup View', () => {
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
})

