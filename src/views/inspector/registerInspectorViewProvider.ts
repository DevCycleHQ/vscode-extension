import * as vscode from 'vscode'
import { InspectorViewProvider } from './InspectorViewProvider'
import utils from '../../utils'

export async function registerInspectorViewProvider(
  context: vscode.ExtensionContext,
) {
  const inspectorViewProvider = new InspectorViewProvider(context.extensionUri)
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'devcycle-inspector',
      inspectorViewProvider,
    ),
  )

  utils.showDebugOutput('Registered Inspector View Provider')

  return inspectorViewProvider
}
