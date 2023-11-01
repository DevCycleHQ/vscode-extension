import { browser } from '@wdio/globals'

export const clickSidebarAction = async (title: string) => {
  const workbench = await browser.getWorkbench()
  const view = await workbench.getActivityBar().getViewControl(title)
  await view?.openView()
}
