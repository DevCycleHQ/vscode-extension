;('use strict')
import * as vscode from 'vscode'
import { KEYS, StateManager } from './StateManager'
import { init, logout, status as cliStatus, Variable } from './cli'
import { SecretStateManager } from './SecretStateManager'
import { autoLoginIfHaveCredentials } from './utils/credentials'
import { SidebarProvider } from './components/SidebarProvider'

import { UsagesTreeProvider } from './components/UsagesTree'
import { getHoverString } from './components/hoverCard'

Object.defineProperty(exports, '__esModule', { value: true })
exports.deactivate = exports.activate = void 0

const REGEX = /[A-Za-z0-9][.A-Za-z_\-0-9]*/
const SCHEME_FILE = {
  scheme: 'file',
}

export const activate = async (context: vscode.ExtensionContext) => {
  SecretStateManager.init(context)
  StateManager.globalState = context.globalState
  StateManager.workspaceState = context.workspaceState

  if (!StateManager.getState(KEYS.SEND_METRICS_PROMPTED)) {
    const sendMetricsMessage = 
      `DevCycle collects usage metrics to gather information on feature adoption, usage, and frequency. 
      By clicking "Accept", you consent to the collection of this data. Would you like to opt-in?`
    vscode.window.showInformationMessage(sendMetricsMessage, 'Accept', 'Decline').then((selection) => {
      vscode.workspace.getConfiguration('devcycle-feature-flags').update('sendMetrics', selection === 'Accept')
      StateManager.setState(KEYS.SEND_METRICS_PROMPTED, true)
    })
  }

  const autoLogin = vscode.workspace
    .getConfiguration('devcycle-feature-flags')
    .get('loginOnWorkspaceOpen')

  const sidebarProvider = new SidebarProvider(context.extensionUri)

  const rootPath =
    vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders.length > 0
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : undefined
  const usagesDataProvider = new UsagesTreeProvider(rootPath, context)
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'devcycle-sidebar',
      sidebarProvider,
    ),
  )
  vscode.window.registerTreeDataProvider(
    'devcycleCodeUsages',
    usagesDataProvider,
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('devcycle-feature-flags.init', async () => {
      await init()
    }),
  )

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'devcycle-feature-flags.openLink',
      async (link: string) => {
        vscode.env.openExternal(vscode.Uri.parse(link))
      },
    ),
  )

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'devcycle-feature-flags.logout',
      async () => {
        await Promise.all([
          SecretStateManager.instance.clearSecrets(),
          StateManager.clearState(),
          vscode.commands.executeCommand(
            'setContext',
            'devcycle-feature-flags.hasCredentialsAndProject',
            false,
          ),
        ])
        // TODO we can probably remove logout() since we aren't logging into the CLI anymore
        await logout()
      },
    ),
  )

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'devcycle-feature-flags.refresh-usages',
      async () => {
        StateManager.clearState()
        await usagesDataProvider.refresh()
      },
    ),
  )

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'devcycle-feature-flags.show-reference',
      async (filePath: string, start: number, end: number) => {
        const document = await vscode.workspace.openTextDocument(filePath)
        await vscode.window.showTextDocument(document)
        const editor = vscode.window.activeTextEditor
        if (!editor) { throw new Error('No active text editor') }
        editor.selection = new vscode.Selection(start - 1, 0, end, 0)
        editor.revealRange(
          editor.selection,
          vscode.TextEditorRevealType.InCenterIfOutsideViewport,
        )
      },
    ),
  )

  if (autoLogin) {
    const isLoggedIn = await autoLoginIfHaveCredentials()
    if (isLoggedIn) {
      await vscode.commands.executeCommand('devcycle-feature-flags.refresh-usages')
    }
  }

  const status = await cliStatus()
  if (status.organization) {
    await vscode.commands.executeCommand(
      'setContext',
      'devcycle-feature-flags.repoConfigured',
      status.repoConfigExists,
    )
    if (status.hasAccessToken) {
      await vscode.commands.executeCommand(
        'setContext',
        'devcycle-feature-flags.loggedIn',
        status.hasAccessToken,
      )
    }
  }

  // On Hover
  vscode.languages.registerHoverProvider(SCHEME_FILE, {
    async provideHover(document, position) {
      const range = document.getWordRangeAtPosition(position, REGEX)

      if (!range) {
        return
      }

      const variableKey = document.getText(range)
      const variables =
        (StateManager.getState(KEYS.VARIABLES) as Record<string, Variable>) || {}
      const variable = variables[variableKey]
      
      if (!variable) {
        return
      }

      const hoverString = await getHoverString(
        variableKey,
        context.extensionUri.toString(),
      )
      return new vscode.Hover(hoverString || '')
    },
  })
}

export function deactivate() {}
