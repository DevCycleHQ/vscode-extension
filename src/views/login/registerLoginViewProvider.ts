import * as vscode from 'vscode'
import { LoginViewProvider } from './LoginViewProvider'

export async function registerLoginViewProvider(context: vscode.ExtensionContext) {
  const loginViewProvider = new LoginViewProvider(context.extensionUri)
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'devcycle-login',
      loginViewProvider
    ),
  )

  return loginViewProvider
}
