import * as vscode from 'vscode'
import {
  getCombinedVariableDetails,
  EnvironmentsCLIController,
  FeaturesCLIController,
  VariablesCLIController,
  UsagesCLIController,
} from '../../../cli'

import { showBusyMessage, hideBusyMessage } from '../../../components/statusBarItem'
import { CodeUsageNode, VariableCodeReference } from './CodeUsageNode'
import { FolderNode } from './FolderNode'

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

  
  constructor(
    private context: vscode.ExtensionContext,
  ) {
    if (!vscode.workspace.workspaceFolders) {
      throw new Error('Must have a workspace to check for code usages')
    }
  }

  private async getCombinedAPIData(folder: vscode.WorkspaceFolder) {
    showBusyMessage('Fetching DevCycle data')
    const variablesCLIController = new VariablesCLIController(folder)
    const featuresCLIController = new FeaturesCLIController(folder)
    const environmentsCLIController = new EnvironmentsCLIController(folder)

    const [variables] = await Promise.all([
      variablesCLIController.getAllVariables(),
      featuresCLIController.getAllFeatures(),
      environmentsCLIController.getAllEnvironments()
    ])
    const result: Record<string, VariableCodeReference> = {}
    await Promise.all(
      Object.entries(variables).map(async ([key, variable]) => {
        const data = await getCombinedVariableDetails(folder, variable, true)
        result[key] = data
      }),
    )
    hideBusyMessage()
    return result
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
      const detailNode = node.children[0].children.find(child => child.key.includes(`:${criteria}`));
      return detailNode?.description || '';
    };
    
    const aValue = getSortValue(a, this.sortKey);
    const bValue = getSortValue(b, this.sortKey);

    return aValue > bValue ? 1 : -1;
  }

  async refreshAll(): Promise<void> {
    const folders = vscode.workspace.workspaceFolders || []
    await Promise.all(
      folders.map((folder) => this.refresh(folder))
    )
  }

  async refresh(folder: vscode.WorkspaceFolder): Promise<void> {
    if (this.isRefreshing[folder.name]) {
      return
    }
    this.isRefreshing[folder.name] = true
    this.flagsByFolder[folder.name] = []
    this._onDidChangeTreeData.fire(undefined)

    // Use withProgress to show a progress indicator
    await vscode.window.withProgress(
      {
        location: { viewId: 'devcycle-code-usages' },
      },
      async () => {
        const usagesCLIController = new UsagesCLIController(folder)
        const variables = await this.getCombinedAPIData(folder)
        const matches = await usagesCLIController.usages()
        matches.forEach((usage) => {
          if (variables[usage.key]) {
            variables[usage.key].references = usage.references
          } else {
            variables[usage.key] = usage
          }
        })
        await Promise.all(Object.values(variables).map(async (match) => {
          this.flagsByFolder[folder.name].push(await CodeUsageNode.flagFrom(match, folder, this.context))
          return
        }))
        this.sortData()
      })
    this.isRefreshing[folder.name] = false
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
}
