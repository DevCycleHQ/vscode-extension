import * as vscode from 'vscode'

import { FolderNode } from '../utils/tree/FolderNode'
import { EnvironmentsCLIController } from '../../cli'
import { EnvironmentNode, KeyListNode } from './nodes'
import { KEYS, StateManager } from '../../StateManager'

const ENV_ORDER = {
  development: 0,
  staging: 1,
  production: 2,
  disaster_recovery: 3,
}

export class EnvironmentsTreeProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    undefined | void
  > = new vscode.EventEmitter<undefined | void>()
  readonly onDidChangeTreeData: vscode.Event<undefined | void> =
    this._onDidChangeTreeData.event

  envsByFolder: Record<string, EnvironmentNode[]> = {}
  isRefreshing: Record<string, boolean> = {}

  async refreshAll(): Promise<void> {
    const folders = vscode.workspace.workspaceFolders || []
    await Promise.all(
      folders.map((folder) => this.refresh(folder))
    )
  }

  async refresh(folder: vscode.WorkspaceFolder): Promise<void> {
    const isLoggedIn = StateManager.getFolderState(folder.name, KEYS.LOGGED_IN)
    if (!isLoggedIn || this.isRefreshing[folder.name]) {
      return
    }

    this.isRefreshing[folder.name] = true
    this.envsByFolder[folder.name] = []
    this._onDidChangeTreeData.fire(undefined)

    // Use withProgress to show a progress indicator
    await vscode.window.withProgress(
      {
        location: { viewId: 'devcycle-environments' },
      },
      async () => {
        const environmentsCLIController = new EnvironmentsCLIController(folder)

        const environments = await environmentsCLIController.getAllEnvironments()

        await Promise.all(
          Object.values(environments).map(async (environment) => {
            const node = new EnvironmentNode(folder, environment)
            this.envsByFolder[folder.name].push(node)
          })
        )
        this.envsByFolder[folder.name].sort((a, b) => ENV_ORDER[a.type] - ENV_ORDER[b.type])
      })
    this._onDidChangeTreeData.fire();
    this.isRefreshing[folder.name] = false
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders || []

    if (!element) {
      return workspaceFolders.length > 1
        ? workspaceFolders.map((folder) => (new FolderNode(folder)))
        : this.envsByFolder[workspaceFolders[0].name]
    }

    if (element instanceof FolderNode) {
      return this.envsByFolder[element.folder.name]
    }

    if (element instanceof EnvironmentNode) {
      return [
        element.keys,
        element.link
      ]
    }

    if (element instanceof KeyListNode) {
      return element.children
    }

    return []
  }
}


