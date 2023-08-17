import * as vscode from 'vscode'

export function showDebugOutput(message: string) {
  const debug = vscode.workspace
    .getConfiguration('devcycle-feature-flags')
    .get('debug')
  if (debug) {
    vscode.window.showInformationMessage(message)
  }
}
