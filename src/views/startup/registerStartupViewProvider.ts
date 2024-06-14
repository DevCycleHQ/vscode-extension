import * as vscode from 'vscode'
import { STARTUP_VIEWS, StartupViewProvider } from './StartupViewProvider'
import utils from '../../utils'

export async function registerStartupViewProvider(
  context: vscode.ExtensionContext,
) {
  const startupViewProvider = new StartupViewProvider(
    context.extensionUri,
    STARTUP_VIEWS.WORKSPACE,
  )

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'devcycle-startup',
      startupViewProvider,
    ),
  )

  utils.showDebugOutput('Registered Startup View Provider')

  return startupViewProvider
}
