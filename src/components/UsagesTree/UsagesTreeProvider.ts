import * as vscode from 'vscode'
import {
  getCombinedVariableDetails,
  EnvironmentsCLIController,
  FeaturesCLIController,
  VariablesCLIController,
  UsagesCLIController,
} from '../../cli'

import { showBusyMessage, hideBusyMessage } from '../statusBarItem'
import { CodeUsageNode, VariableCodeReference } from './CodeUsageNode'

export class UsagesTreeProvider
  implements vscode.TreeDataProvider<CodeUsageNode>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    CodeUsageNode | undefined | void
  > = new vscode.EventEmitter<CodeUsageNode | undefined | void>()
  readonly onDidChangeTreeData: vscode.Event<CodeUsageNode | undefined | void> =
    this._onDidChangeTreeData.event
  private flagsSeen: CodeUsageNode[] = []
  private isRefreshing = false
  private folder: vscode.WorkspaceFolder

  private variablesCLIController: VariablesCLIController
  private featuresCLIController: FeaturesCLIController
  private environmentsCLIController: EnvironmentsCLIController
  private usagesCLIController: UsagesCLIController

  constructor(
    folder: vscode.WorkspaceFolder | undefined,
    private context: vscode.ExtensionContext,
  ) {
    if (!folder) {
      throw new Error('Must have a workspace to check for code usages')
    }

    this.folder = folder
    this.variablesCLIController = new VariablesCLIController(folder)
    this.featuresCLIController = new FeaturesCLIController(folder)
    this.environmentsCLIController = new EnvironmentsCLIController(folder)
    this.usagesCLIController = new UsagesCLIController(folder)
  }

  private async getCombinedAPIData() {
    showBusyMessage('Fetching DevCycle data')
    const [variables] = await Promise.all([
      this.variablesCLIController.getAllVariables(),
      this.featuresCLIController.getAllFeatures(),
      this.environmentsCLIController.getAllEnvironments()
    ])
    const result: Record<string, VariableCodeReference> = {}
    await Promise.all(
      Object.entries(variables).map(async ([key, variable]) => {
        const data = await getCombinedVariableDetails(this.folder, variable, true)
        result[key] = data
      }),
    )
    hideBusyMessage()
    return result
  }

  async refresh(): Promise<void> {
    if (this.isRefreshing) {
      return
    }
    this.isRefreshing = true
    this.flagsSeen = []
    this._onDidChangeTreeData.fire(undefined)

    // Use withProgress to show a progress indicator
    await vscode.window.withProgress(
      {
        location: { viewId: 'devcycleCodeUsages' },
      },
      async () => {
        const variables = await this.getCombinedAPIData()
        const matches = await this.usagesCLIController.usages()
        matches.forEach((usage) => {
          if (variables[usage.key]) {
            variables[usage.key].references = usage.references
          } else {
            variables[usage.key] = usage
          }
        })
        await Promise.all(Object.values(variables).map(async (match) => {
          this.flagsSeen.push(await CodeUsageNode.flagFrom(match, this.folder, this.context))
          return
        }))
        this.flagsSeen.sort((a, b) => (a.key > b.key ? 1 : -1))
        this._onDidChangeTreeData.fire()
      })
    this.isRefreshing = false
  }

  getTreeItem(element: CodeUsageNode): vscode.TreeItem {
    return element
  }

  async getChildren(element?: CodeUsageNode): Promise<CodeUsageNode[]> {
    return element ? element.children : this.flagsSeen
  }
}
