;('use strict')
import * as vscode from 'vscode'
import * as path from 'path'
import { KEYS, StateManager } from './StateManager'
import { AuthCLIController, BaseCLIController, getOrganizationId } from './cli'
import { getHoverString } from './components/hoverCard'
import { trackRudderstackEvent } from './RudderStackService'
import { registerStartupViewProvider } from './views/startup'
import { registerLoginViewProvider } from './views/login'
import { UsagesTreeProvider, registerUsagesViewProvider } from './views/usages'
import { EnvironmentsTreeProvider, registerEnvironmentsViewProvider } from './views/environments'
import { registerResourcesViewProvider } from './views/resources'
import { registerHomeViewProvider } from './views/home'
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
import utils from './utils'
import { SHOW_HOME_VIEW, SHOW_INSPECTOR_VIEW } from './constants'
import { InspectorViewProvider, registerInspectorViewProvider } from './views/inspector'
import { loadRepoConfig } from './utils/loadRepoConfig'
import { registerRefreshInspectorCommand } from './commands/refreshInspector'

Object.defineProperty(exports, '__esModule', { value: true })
exports.deactivate = exports.activate = void 0

const REGEX = /[A-Za-z0-9][.A-Za-z_\-0-9]*/
const SCHEME_FILE = {
  scheme: 'file',
}

// Hide home view until development is done
vscode.commands.executeCommand(
  'setContext',
  'devcycle-feature-flags.shouldShowHomeView',
  SHOW_HOME_VIEW,
)

// Hide inspector view until development is done
vscode.commands.executeCommand(
  'setContext',
  'devcycle-feature-flags.shouldShowInspectorView',
  SHOW_INSPECTOR_VIEW,
)

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

  await registerStartupViewProvider(context)
  await registerLoginViewProvider(context)
  const { usagesDataProvider, usagesTreeView } = await registerUsagesViewProvider(context)
  const environmentsDataProvider = await registerEnvironmentsViewProvider(context)
  const refreshProviders: (UsagesTreeProvider | EnvironmentsTreeProvider | InspectorViewProvider)[] = [
    usagesDataProvider, 
    environmentsDataProvider
  ]

  await registerResourcesViewProvider(context)
  if (SHOW_HOME_VIEW) { await registerHomeViewProvider(context) }
  if (SHOW_INSPECTOR_VIEW) { 
    const inspectorViewProvider = await registerInspectorViewProvider(context)
    refreshProviders.push(inspectorViewProvider) 
    await registerRefreshInspectorCommand(context, inspectorViewProvider)
  }

  await registerUsagesNodeClickedCommand(context)
  await registerInitCommand(context)
  await registerOpenLinkCommand(context)
  await registerCopyToClipboardCommand(context)
  await registerLogoutCommand(context)
  await registerRefreshAllCommand(context, refreshProviders)
  await registerRefreshUsagesCommand(context, usagesDataProvider)
  await registerRefreshEnvironmentsCommand(context, environmentsDataProvider)
  await registerSortUsagesCommand(context, usagesDataProvider)
  await registerShowReferenceCommand(context)
  await registerOpenSettingsCommand(context)
  await registerOpenUsagesViewCommand(context, usagesTreeView, usagesDataProvider)

  const settingsConfig = vscode.workspace.getConfiguration('devcycle-feature-flags')
  
  if (settingsConfig.get('loginOnWorkspaceOpen')) {
    utils.loginAndRefresh()
  }

  // On Hover
  vscode.languages.registerHoverProvider(SCHEME_FILE, {
    async provideHover(document, position) {
      const activeDocument = vscode.window.activeTextEditor?.document
      const currentFolder = activeDocument ? vscode.workspace.getWorkspaceFolder(activeDocument.uri) : undefined
      if (!currentFolder) { return }
      const range = document.getWordRangeAtPosition(position, REGEX)

      if (!range) { return }

      const variableAliases = (await utils.getRepoConfig(currentFolder)).codeInsights?.variableAliases || {}
      let variableKey = document.getText(range)
      variableKey = variableAliases[variableKey] || variableKey

      const codeUsages = StateManager.getFolderState(currentFolder.name, KEYS.CODE_USAGE_KEYS) || {}

      if (!codeUsages[variableKey]) { return }

      const hoverString = await getHoverString(currentFolder, variableKey)
      return new vscode.Hover(hoverString)
    },
  })

  vscode.workspace.onDidSaveTextDocument(async (document) => {
    const filePath = document.uri.path
    const folder = vscode.workspace.getWorkspaceFolder(document.uri)
    if (!folder) { return }

    const cli = new BaseCLIController(folder)
    const { repoConfigPath } = await cli.status()

    if (filePath === path.join(folder.uri.path, repoConfigPath)) {
      await loadRepoConfig(folder)
    } else if (settingsConfig.get('refreshUsagesOnSave')) {
      await usagesDataProvider.refresh(folder, false)
    }
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
