import * as vscode from 'vscode'
import { EnvironmentsTreeProvider } from './EnvironmentsTreeProvider'
import utils from '../../utils'

export async function registerEnvironmentsViewProvider(
  context: vscode.ExtensionContext,
) {
  const treeDataProvider = new EnvironmentsTreeProvider()

  const treeView = vscode.window.createTreeView('devcycle-environments', {
    treeDataProvider,
  })

  utils.showDebugOutput('Registered Environments View Provider')

  return treeDataProvider
}
