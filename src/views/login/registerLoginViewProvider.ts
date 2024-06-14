import * as vscode from 'vscode'
import { LoginViewProvider } from './LoginViewProvider'
import utils from '../../utils'

export async function registerLoginViewProvider(
  context: vscode.ExtensionContext,
) {
  const loginViewProvider = new LoginViewProvider(context.extensionUri)
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'devcycle-login',
      loginViewProvider,
    ),
  )

  utils.showDebugOutput('Registered Login View Provider')

  return loginViewProvider
}
