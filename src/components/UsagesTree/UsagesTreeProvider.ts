import * as vscode from 'vscode'
import {
  usages,
  getAllVariables,
  getAllEnvironments,
  getCombinedVariableDetails,
  getOrganizationId,
  getAllFeatures,
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

  constructor(
    private workspaceRoot: string | undefined,
    private context: vscode.ExtensionContext,
  ) {}

  private async getCombinedAPIData() {
    showBusyMessage('Fetching DevCycle data')
    const [variables] = await Promise.all([getAllVariables(), getAllFeatures(), getAllEnvironments()])
    const result = {} as Record<string, VariableCodeReference>
    await Promise.all(
      Object.entries(variables).map(async ([key, variable]) => {
        const data = await getCombinedVariableDetails(variable, true)
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
    const root = this.workspaceRoot
    if (!root) {
      throw new Error('Must have a workspace to check for code usages')
    }

    // Use withProgress to show a progress indicator
    await vscode.window.withProgress(
      {
        location: { viewId: 'devcycleCodeUsages' },
      },
      async () => {
        const variables = await this.getCombinedAPIData()
        const matches = await usages()
        matches.forEach((usage) => {
          if (variables[usage.key]) {
            variables[usage.key].references = usage.references
          } else {
            variables[usage.key] = usage
          }
        })
        await Promise.all(Object.values(variables).map(async (match) => {
          this.flagsSeen.push(await CodeUsageNode.flagFrom(match, root, this.context))
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
    if (!this.workspaceRoot) {
      vscode.window.showInformationMessage('No dependency in empty workspace')
      return []
    }
    
    if (element) {
      return element.children
    }
    
    return this.flagsSeen
  }
}
