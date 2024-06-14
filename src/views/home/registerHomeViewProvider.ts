import * as vscode from 'vscode'
import { HomeViewProvider } from './HomeViewProvider'
import utils from '../../utils'

export async function registerHomeViewProvider(
  context: vscode.ExtensionContext,
) {
  const homeViewProvider = new HomeViewProvider(context.extensionUri)
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'devcycle-home',
      homeViewProvider,
    ),
  )

  utils.showDebugOutput('Registered Home View Provider')

  return homeViewProvider
}
