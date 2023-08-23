import * as vscode from 'vscode'

export class FolderNode extends vscode.TreeItem {
  constructor(
    public folder: vscode.WorkspaceFolder,
  ) {
    super(folder.name, vscode.TreeItemCollapsibleState.Expanded)
  }
}
