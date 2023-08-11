;('use strict')
import * as vscode from 'vscode'
import { KEYS, StateManager } from './StateManager'
import { BaseCLIController, AuthCLIController, getOrganizationId } from './cli'
import { autoLoginIfHaveCredentials } from './utils/credentials'
import { SidebarProvider } from './components/SidebarProvider'

import { UsagesTreeProvider } from './components/UsagesTree'
import { getHoverString } from './components/hoverCard'
import { trackRudderstackEvent } from './RudderStackService'
import { CodeUsageNode } from './components/UsagesTree/CodeUsageNode'
import { getRepoConfig, loadRepoConfig } from './utils'
import { setUpCliStartupView, setUpWorkspaceStartupView } from './utils/setUpViews'
import { STARTUP_VIEWS, StartupViewProvider } from './components/StartupViewProvider'

Object.defineProperty(exports, '__esModule', { value: true })
exports.deactivate = exports.activate = void 0

const REGEX = /[A-Za-z0-9][.A-Za-z_\-0-9]*/
const SCHEME_FILE = {
  scheme: 'file',
}

export const activate = async (context: vscode.ExtensionContext) => {
  StateManager.globalState = context.globalState
  StateManager.workspaceState = context.workspaceState

  const [workspaceFolder] = vscode.workspace.workspaceFolders || []

  if (!StateManager.getWorkspaceState(KEYS.SEND_METRICS_PROMPTED)) {
    const sendMetricsMessage = 
      `DevCycle collects usage metrics to gather information on feature adoption, usage, and frequency. 
      By clicking "Accept", you consent to the collection of this data. Would you like to opt-in?`
    vscode.window.showInformationMessage(sendMetricsMessage, 'Accept', 'Decline').then((selection) => {
      vscode.workspace.getConfiguration('devcycle-feature-flags').update('sendMetrics', selection === 'Accept')
      StateManager.setWorkspaceState(KEYS.SEND_METRICS_PROMPTED, true)
    })
  }
 
  if (!StateManager.getGlobalState(KEYS.EXTENSION_INSTALLED)) {
    const orgId = getOrganizationId(workspaceFolder)
    trackRudderstackEvent('Extension Installed', orgId)
    await StateManager.setGlobalState(KEYS.EXTENSION_INSTALLED, true)
  }

  const autoLogin = vscode.workspace
    .getConfiguration('devcycle-feature-flags')
    .get('loginOnWorkspaceOpen')
  
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

  const sidebarProvider = new SidebarProvider(context.extensionUri)
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'devcycle-sidebar',
      sidebarProvider
    ),
  )

  const usagesDataProvider = new UsagesTreeProvider(context)

  const usagesTreeView = vscode.window.createTreeView(
    'devcycle-code-usages',
    { treeDataProvider: usagesDataProvider },
  )
  usagesTreeView.onDidChangeVisibility(async (e) => {
    const orgId = getOrganizationId(workspaceFolder)
    trackRudderstackEvent('Usages Viewed', orgId)
  })

  usagesTreeView.onDidChangeSelection((e) => {
    const node = e.selection[0]
    if (node instanceof CodeUsageNode && node.type === 'usage') {
      vscode.commands.executeCommand(
        'devcycle-featureflags.usagesNodeClicked',
        node
      )
    }
  })

  vscode.workspace.workspaceFolders?.forEach(async (folder) => {
    await loadRepoConfig(folder)
  })

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'devcycle-featureflags.usagesNodeClicked',
      async (node: CodeUsageNode) => {
        const orgId = getOrganizationId(workspaceFolder)
        trackRudderstackEvent('Code Usage Clicked', orgId)
      }
    )
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('devcycle-feature-flags.init', async () => {
      vscode.workspace.workspaceFolders?.forEach(async (folder) => {
        const orgId = getOrganizationId(folder)
        trackRudderstackEvent('Init Command Ran', orgId)
        const cli = new AuthCLIController(folder)
        await cli.init()
      })
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
          StateManager.clearState(),
          vscode.commands.executeCommand(
            'setContext',
            'devcycle-feature-flags.hasCredentialsAndProject',
            false,
          ),
        ])
        const [folder] = vscode.workspace.workspaceFolders || []
        if (folder) {
          const cli = new AuthCLIController(folder)
          await cli.logout()
        }
        const orgId = getOrganizationId(folder)
        trackRudderstackEvent('Logout Command Ran', orgId)
      },
    ),
  )

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'devcycle-feature-flags.refresh-usages',
      async (folder?: vscode.WorkspaceFolder) => {
        if (folder) {
          StateManager.clearFolderState(folder.name)
          await usagesDataProvider.refresh(folder)
        } else {
          StateManager.clearState()
          await usagesDataProvider.refreshAll()
        }
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

  vscode.workspace.workspaceFolders?.forEach(async (folder) => {
    if (autoLogin) {
        const isLoggedIn = await autoLoginIfHaveCredentials(folder)
        if (isLoggedIn) {
          await vscode.commands.executeCommand('devcycle-feature-flags.refresh-usages', folder)
        }
    }

    const cli = new BaseCLIController(folder)
    const status = await cli.status()
    if (status.organization) {
      // TODO: scope commands to folder
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
  })

  // On Hover
  vscode.languages.registerHoverProvider(SCHEME_FILE, {
    async provideHover(document, position) {
      const activeDocument = vscode.window.activeTextEditor?.document
      const currentFolder = activeDocument ? vscode.workspace.getWorkspaceFolder(activeDocument.uri) : undefined
      if (!currentFolder) return
      const range = document.getWordRangeAtPosition(position, REGEX)

      if (!range) {
        return
      }

      const variableAliases = (await getRepoConfig(currentFolder)).codeInsights?.variableAliases || {}
      let variableKey = document.getText(range)
      variableKey = variableAliases[variableKey] || variableKey

      const variables = StateManager.getFolderState(currentFolder.name, KEYS.VARIABLES) || {}
      const keyInAPIVariables = !!variables[variableKey]        
      const keyInCodeUsages = StateManager.getFolderState(currentFolder.name, KEYS.CODE_USAGE_KEYS)?.includes(variableKey)
      
      if (!keyInAPIVariables && !keyInCodeUsages) {
        return
      }

      const hoverString = await getHoverString(
        currentFolder,
        variableKey,
        context.extensionUri.toString(),
      )
      return new vscode.Hover(hoverString || '')
    },
  })
}

export function deactivate() {}
