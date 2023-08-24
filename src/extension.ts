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
import { registerEnvironmentsViewProvider } from './views/environments'
import { registerResourcesViewProvider } from './views/resources'
import {
  executeRefreshAllCommand,
  registerRefreshAllCommand,
  registerInitCommand,
  registerUsagesNodeClickedCommand,
  registerOpenLinkCommand,
  registerCopyToClipboardCommand,
  registerSortUsagesCommand,
  registerLogoutCommand,
  registerRefreshEnvironmentsCommand,
  registerRefreshUsagesCommand,
  registerShowReferenceCommand,
  registerOpenSettingsCommand,
  registerOpenUsagesViewCommand
} from './commands'
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

  const { workspaceFolders = [] } = vscode.workspace
  const [workspaceFolder] = workspaceFolders

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
  const { usagesDataProvider, usagesTreeView } = await registerUsagesViewProvider(context)
  const environmentsDataProvider = await registerEnvironmentsViewProvider(context)
  await registerResourcesViewProvider(context)

  workspaceFolders.forEach(async (folder) => {
    await loadRepoConfig(folder)
  })

  await registerUsagesNodeClickedCommand(context)
  await registerInitCommand(context)
  await registerOpenLinkCommand(context)
  await registerCopyToClipboardCommand(context)
  await registerLogoutCommand(context)
  await registerRefreshAllCommand(context, [usagesDataProvider, environmentsDataProvider])
  await registerRefreshUsagesCommand(context, usagesDataProvider)
  await registerRefreshEnvironmentsCommand(context, environmentsDataProvider)
  await registerSortUsagesCommand(context, usagesDataProvider)
  await registerShowReferenceCommand(context)
  await registerOpenSettingsCommand(context)
  await registerOpenUsagesViewCommand(context, usagesTreeView, usagesDataProvider)


  if (autoLogin) {
    await Promise.all(workspaceFolders.map(autoLoginIfHaveCredentials))
    await executeRefreshAllCommand()
  }

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
      )
      return new vscode.Hover(hoverString || '')
    },
  })

  vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
    for (const folder of event.added) {
      const cli = new AuthCLIController(folder)
      await cli.login()
    }
    await executeRefreshAllCommand()
  })
}

export function deactivate() {}
