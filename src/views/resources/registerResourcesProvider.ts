import * as vscode from 'vscode'
import { ResourcesViewProvider } from './ResourcesViewProvider'
import utils from '../../utils'

export async function registerResourcesViewProvider(
  context: vscode.ExtensionContext,
) {
  const resourcesProvider = new ResourcesViewProvider(context.extensionUri)
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'devcycle-resources',
      resourcesProvider,
    ),
  )

  utils.showDebugOutput('Registered Resources View Provider')

  return resourcesProvider
}
