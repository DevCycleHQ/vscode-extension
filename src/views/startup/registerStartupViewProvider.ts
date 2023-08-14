import * as vscode from 'vscode'
import { STARTUP_VIEWS, StartupViewProvider } from './StartupViewProvider'
import { setUpCliStartupView, setUpWorkspaceStartupView } from './utils/setUpViews'

export async function registerStartupViewProvider(context: vscode.ExtensionContext) {
  let startupViewProvider: StartupViewProvider | undefined
  if (setUpWorkspaceStartupView()) {
    startupViewProvider = new StartupViewProvider(context.extensionUri, STARTUP_VIEWS.WORKSPACE)
  } else if (await setUpCliStartupView()) {
    startupViewProvider = new StartupViewProvider(context.extensionUri, STARTUP_VIEWS.CLI)
  } 

  if (startupViewProvider) {
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        'devcycle-startup',
        startupViewProvider
      ),
    )
  }

  return startupViewProvider
}