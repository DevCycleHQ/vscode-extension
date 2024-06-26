import * as vscode from 'vscode'
import {
  VariablesCLIController,
  UsagesCLIController,
  JSONMatch,
  Variable,
} from '../../../cli'

import { CodeUsageNode } from './CodeUsageNode'
import { FolderNode } from '../../utils/tree/FolderNode'
import { KEYS, StateManager } from '../../../StateManager'
import { updateMatchesFromSavedFile } from './utils'
import utils from '../../../utils'

export class UsagesTreeProvider
  implements vscode.TreeDataProvider<CodeUsageNode>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    CodeUsageNode | undefined | void
  > = new vscode.EventEmitter<CodeUsageNode | undefined | void>()
  readonly onDidChangeTreeData: vscode.Event<CodeUsageNode | undefined | void> =
    this._onDidChangeTreeData.event
  private flagsByFolder: Record<string, CodeUsageNode[]> = {}
  private matchesByFolder: Record<string, JSONMatch[] | undefined> = {}
  private isRefreshing: Record<string, boolean> = {}
  sortKey: 'key' | 'createdAt' | 'updatedAt' = 'key'
  sortAsc: boolean = true

  constructor(private context: vscode.ExtensionContext) {
    if (!vscode.workspace.workspaceFolders) {
      throw new Error('Must have a workspace to check for code usages')
    }
  }

  sortData(): void {
    Object.keys(this.flagsByFolder).forEach((folderName) => {
      this.flagsByFolder[folderName].sort(this.sortFunction)
    })
    this._onDidChangeTreeData.fire()
  }

  private sortFunction = (a: CodeUsageNode, b: CodeUsageNode): number => {
    const getSortValue = (node: CodeUsageNode, criteria: string): string => {
      if (criteria === 'key') {
        return node.key
      }
      const detailNode = node.children[0].children.find((child) =>
        child.key.includes(`:${criteria}`),
      )
      return detailNode?.description || ''
    }

    const aValue = getSortValue(a, this.sortKey)
    const bValue = getSortValue(b, this.sortKey)

    const val = aValue > bValue ? 1 : -1
    return this.sortAsc ? val : val * -1
  }

  async refreshAll(): Promise<void> {
    const folders = vscode.workspace.workspaceFolders || []
    await Promise.all(folders.map((folder) => this.refresh(folder)))
  }

  async refresh(
    folder: vscode.WorkspaceFolder,
    showLoading: boolean = true,
    savedFilePath?: string,
  ): Promise<void> {
    utils.showDebugOutput(`Refreshing usages for ${folder.name}`)

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
        try {
          const usagesCLIController = new UsagesCLIController(folder)
          const variablesCLIController = new VariablesCLIController(folder)

          const variables = await variablesCLIController.getAllVariables()
          const relativeSavedFilePath = savedFilePath
            ?.replace(folder.uri.fsPath, '')
            ?.substring(1)
          const matches = await usagesCLIController.usages(
            relativeSavedFilePath,
          )

          let updatedMatches = matches
          if (this.matchesByFolder[folder.name] && relativeSavedFilePath) {
            updatedMatches = updateMatchesFromSavedFile(
              this.matchesByFolder[folder.name] as JSONMatch[],
              matches,
              relativeSavedFilePath,
            )
          } else {
            // If we're not refreshing a single file, usages are called for the entire folder
            this.matchesByFolder[folder.name] = matches
          }
          await this.populateCodeUsagesNodes(updatedMatches, variables, folder)
        } catch (e) {
          vscode.window.showErrorMessage((e as Error).message)
        }
      },
    )
    this.isRefreshing[folder.name] = false
    utils.showDebugOutput(`Finished refreshing usages for ${folder.name}`)
  }

  private async populateCodeUsagesNodes(
    matches: JSONMatch[],
    variables: Record<string, Variable>,
    folder: vscode.WorkspaceFolder,
  ) {
    await Promise.all(
      matches.map(async (match) => {
        const variable = variables[match.key]
        const populatedMatch = variable ? { ...match, variable } : match

        const usageNode = await CodeUsageNode.flagFrom(
          populatedMatch,
          folder,
          this.context,
        )
        this.flagsByFolder[folder.name].push(usageNode)
      }),
    )
    if (this.flagsByFolder[folder.name].length === 0) {
      const noUsagesNode = new CodeUsageNode(
        'noUsages',
        'No usages found',
        'usage',
      )
      this.flagsByFolder[folder.name].push(noUsagesNode)
    }
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
        ? workspaceFolders.map((folder) => new FolderNode(folder))
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

  findElementByKeyInFolder(
    key: string,
    folder: vscode.WorkspaceFolder,
  ): CodeUsageNode | undefined {
    const folderNodes = this.flagsByFolder[folder.name]
    if (!folderNodes) {
      return undefined
    }

    const foundNode = folderNodes.find((node) => node.key === key)
    return foundNode
  }
}
