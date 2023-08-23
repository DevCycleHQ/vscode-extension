import * as vscode from 'vscode'
import { EnvironmentsTreeProvider } from './EnvironmentsTreeProvider'

export async function registerEnvironmentsViewProvider(context: vscode.ExtensionContext) {
  const treeDataProvider = new EnvironmentsTreeProvider()

  const treeView = vscode.window.createTreeView(
    'devcycle-environments',
    { treeDataProvider },
  )

  return treeDataProvider
}
