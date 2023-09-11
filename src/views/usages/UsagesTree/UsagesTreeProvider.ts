import * as vscode from 'vscode'
import {
  VariablesCLIController,
  UsagesCLIController,
  JSONMatch,
  Variable
} from '../../../cli'

import { CodeUsageNode } from './CodeUsageNode'
import { FolderNode } from '../../utils/tree/FolderNode'
import { KEYS, StateManager } from '../../../StateManager'

export class UsagesTreeProvider
  implements vscode.TreeDataProvider<CodeUsageNode>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    CodeUsageNode | undefined | void
  > = new vscode.EventEmitter<CodeUsageNode | undefined | void>()
  readonly onDidChangeTreeData: vscode.Event<CodeUsageNode | undefined | void> =
    this._onDidChangeTreeData.event
  private flagsByFolder: Record<string, CodeUsageNode[]> = {}
  private isRefreshing: Record<string, boolean> = {}
  sortKey: 'key' | 'createdAt' | 'updatedAt' = 'key'
  sortAsc: boolean = true

  constructor(
    private context: vscode.ExtensionContext,
  ) {
    if (!vscode.workspace.workspaceFolders) {
      throw new Error('Must have a workspace to check for code usages')
    }
  }

  sortData(): void {
    Object.keys(this.flagsByFolder).forEach(folderName => {
      this.flagsByFolder[folderName].sort(this.sortFunction);
    });
    this._onDidChangeTreeData.fire();
  }

  private sortFunction = (a: CodeUsageNode, b: CodeUsageNode): number => {
    const getSortValue = (node: CodeUsageNode, criteria: string): string => {
      if (criteria === 'key') {
        return node.key
      }
      const detailNode = node.children[0].children.find(child => child.key.includes(`:${criteria}`))
      return detailNode?.description || ''
    }

    const aValue = getSortValue(a, this.sortKey)
    const bValue = getSortValue(b, this.sortKey)

    const val = aValue > bValue ? 1 : -1
    return this.sortAsc ? val : val * -1
  }

  async refreshAll(): Promise<void> {
    const folders = vscode.workspace.workspaceFolders || []
    await Promise.all(
      folders.map((folder) => this.refresh(folder))
    )
  }

  async refresh(folder: vscode.WorkspaceFolder, showLoading: boolean = true): Promise<void> {
    const isLoggedIn = StateManager.getFolderState(folder.name, KEYS.LOGGED_IN)
    if (!isLoggedIn || this.isRefreshing[folder.name]) {
      return
    }

    this.isRefreshing[folder.name] = true
    this.flagsByFolder[folder.name] = []
    if (showLoading) {
      this._onDidChangeTreeData.fire(undefined)
    }

    // Use withProgress to show a progress indicator
    await vscode.window.withProgress(
      {
        location: { viewId: 'devcycle-code-usages' },
      },
      async () => {
        const usagesCLIController = new UsagesCLIController(folder)
        const variablesCLIController = new VariablesCLIController(folder)

        const variables = await variablesCLIController.getAllVariables()
        const matches = await usagesCLIController.usages()

        await this.populateCodeUsagesNodes(matches, variables, folder)
      })
    this.isRefreshing[folder.name] = false
  }

  private async populateCodeUsagesNodes(matches: JSONMatch[], variables: Record<string, Variable>, folder: vscode.WorkspaceFolder) {
    await Promise.all(
      matches.map(async (match) => {
        const variable = variables[match.key]
        const populatedMatch = variable ? { ...match, variable } : match

        const usageNode = await CodeUsageNode.flagFrom(populatedMatch, folder, this.context)
        this.flagsByFolder[folder.name].push(usageNode)
      })
    )
    this.sortData()
  }
  getTreeItem(element: CodeUsageNode): vscode.TreeItem {
    return element
  }

  async getChildren(): Promise<FolderNode[] | CodeUsageNode[]>
  async getChildren(element: FolderNode): Promise<CodeUsageNode[]>
  async getChildren(element: CodeUsageNode): Promise<CodeUsageNode[]>
  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders || []

    if (!element) {
      return workspaceFolders.length > 1
        ? workspaceFolders.map((folder) => (new FolderNode(folder)))
        : this.flagsByFolder[workspaceFolders[0].name]
    }

    if (element instanceof FolderNode) {
      return this.flagsByFolder[element.folder.name]
    }

    if (element instanceof CodeUsageNode) {
      return element.children
    }

    return []
  }

  // In order to use TreeView.reveal method, we need to implement getParent method
  getParent(element: CodeUsageNode): vscode.ProviderResult<CodeUsageNode> {
    return element
  }

  findElementByKeyInFolder(key: string, folder: vscode.WorkspaceFolder): CodeUsageNode | undefined {
    const folderNodes = this.flagsByFolder[folder.name]
    if (!folderNodes) {
      return undefined
    }

    const foundNode = folderNodes.find(node => node.key === key)
    return foundNode
  }
}
