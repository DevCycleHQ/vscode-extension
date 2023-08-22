import * as vscode from 'vscode'
import { ResourcesViewProvider } from './ResourcesViewProvider'

export async function registerResourcesViewProvider(context: vscode.ExtensionContext) {
  const resourcesProvider = new ResourcesViewProvider(context.extensionUri)
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'devcycle-resources',
      resourcesProvider
    ),
  )

  return resourcesProvider
}
