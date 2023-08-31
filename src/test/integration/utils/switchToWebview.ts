import { browser, $, $$ } from '@wdio/globals'

export const switchToWebview = async (selector: string) => {
  await browser.switchToFrame(null)
  await browser.waitUntil(async () => {
    const iframes = await $$('iframe.webview.ready')
    if (iframes.length) {
      for (const iframe of iframes) {
        await browser.switchToFrame(iframe)
        await browser.pause(1000)

        const activeFrame = await $('iframe')
        if (activeFrame.error) continue
        await browser.switchToFrame(activeFrame)

        const element = await $(selector)
        if (!element.error) return true

        await browser.switchToFrame(null)
      }
    }
    return false
  }, { timeoutMsg: `Could not find element ${selector} in any webview` })
}
