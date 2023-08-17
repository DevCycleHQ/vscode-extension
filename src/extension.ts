;('use strict')
import * as vscode from 'vscode'
import { KEYS, StateManager } from './StateManager'
import { AuthCLIController, getOrganizationId } from './cli'
import { autoLoginIfHaveCredentials } from './utils/credentials'

import { getHoverString } from './components/hoverCard'
import { trackRudderstackEvent } from './RudderStackService'
import { getRepoConfig, loadRepoConfig } from './utils'
import { registerStartupViewProvider } from './views/startup'
import { registerLoginViewProvider } from './views/login'
import { registerUsagesViewProvider } from './views/usages'
import {
  registerInitCommand,
  registerUsagesNodeClickedCommand,
  registerOpenLinkCommand
} from './commands'
import { registerLogoutCommand } from './commands/logout'
import { executeRefreshUsagesCommand, registerRefreshUsagesCommand } from './commands/refreshUsages'
import { registerShowReferenceCommand } from './commands/showReference'
import cliUtils from './cli/utils'

Object.defineProperty(exports, '__esModule', { value: true })
exports.deactivate = exports.activate = void 0

const REGEX = /[A-Za-z0-9][.A-Za-z_\-0-9]*/
const SCHEME_FILE = {
  scheme: 'file',
}

export const activate = async (context: vscode.ExtensionContext) => {
  StateManager.globalState = context.globalState
  StateManager.workspaceState = context.workspaceState

  await cliUtils.loadCli()

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
  
  await registerStartupViewProvider(context)
  await registerLoginViewProvider(context)
  const usagesDataProvider = await registerUsagesViewProvider(context)

  vscode.workspace.workspaceFolders?.forEach(async (folder) => {
    await loadRepoConfig(folder)
  })

  await registerUsagesNodeClickedCommand(context)
  await registerInitCommand(context)
  await registerOpenLinkCommand(context)
  await registerLogoutCommand(context)
  await registerRefreshUsagesCommand(context, usagesDataProvider)
  await registerShowReferenceCommand(context)

  vscode.workspace.workspaceFolders?.forEach(async (folder) => {
    if (autoLogin) {
        const isLoggedIn = await autoLoginIfHaveCredentials(folder)
        if (isLoggedIn) {
          await executeRefreshUsagesCommand(folder)
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

  vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
    for (const folder of event.added) {
      const cli = new AuthCLIController(folder)
      await cli.login()
    }
    await executeRefreshUsagesCommand()
  })
}

export function deactivate() {}
