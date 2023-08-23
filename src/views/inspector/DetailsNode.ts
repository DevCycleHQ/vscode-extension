import * as vscode from 'vscode'
import path from 'path'
import { Variable } from '../../cli'

const collapsedMap = {
  flag: vscode.TreeItemCollapsibleState.Collapsed,
  usage: vscode.TreeItemCollapsibleState.None,
  detail: vscode.TreeItemCollapsibleState.None,
  header: vscode.TreeItemCollapsibleState.Expanded,
}

export class DetailsNode extends vscode.TreeItem {
  static async flagFrom(
    variable: Variable,
    folder: vscode.WorkspaceFolder,
    context: vscode.ExtensionContext,
  ) {
    const children = []
    const key = variable.key

    const detailsChildNodes = [
        new DetailsNode(
          key + ':status',
          `Status`,
          'detail',
          [],
          variable.status,
        ),
        new DetailsNode(
          key + ':createdAt',
          `Created Date`,
          'detail',
          [],
          variable.createdAt,
        ),
        new DetailsNode(
          key + ':updatedAt',
          `Updated Date`,
          'detail',
          [],
          variable.updatedAt,
        ),
        new DetailsNode(key + ':id', `ID`, 'detail', [], variable._id),
        new DetailsNode(
          key + ':feature',
          `Feature`,
          'detail',
          [],
        //   feature?.name || feature?.key || 'Unassociated',
          variable._feature
        ),
      ]

      if (variable.description?.length) {
        detailsChildNodes.unshift(
          new DetailsNode(
            key + ':description',
            `Description`,
            'detail',
            [],
            variable.description,
          ),
        )
      }
      if (variable.name?.length) {
        detailsChildNodes.unshift(
          new DetailsNode(key + ':name', `Name`, 'detail', [], variable.name),
        )
      }
    //   const orgId = getOrganizationId(folder)
    //   const projectId = StateManager.getFolderState(folder.name, KEYS.PROJECT_ID)
    //   if (orgId && projectId) {
    //     const link = `https://app.devcycle.com/o/${orgId}/p/${projectId}/variables/${variable._id}`
    //     const linkNode = new DetailsNode(
    //       key + ':link',
    //       `Open In Dashboard ↗`,
    //       'detail',
    //       [],
    //     )
    //     linkNode.command = {
    //       title: '',
    //       command: 'devcycle-feature-flags.openLink',
    //       arguments: [link],
    //     }
    //     linkNode.tooltip = link
    //     detailsChildNodes.push(linkNode)
    //   }

      const variableDetailsRoot = new DetailsNode(
        key,
        'Details',
        'header',
        detailsChildNodes,
      )
      children.push(variableDetailsRoot)

    const instance = new DetailsNode(key, key, 'flag', children)
    instance.key = key
    // instance.iconPath = {
    //   dark: vscode.Uri.joinPath(
    //     context.extensionUri,
    //     'media',
    //     'variable' in match ? 'flag-filled-white.svg' : 'flag-filled-white-red-dot.svg',
    //   ),
    //   light: vscode.Uri.joinPath(
    //     context.extensionUri,
    //     'media',
    //     'variable' in match ? 'flag-filled.svg' : 'flag-filled-red-dot.svg',
    //   ),
    // }
    return instance
  }

  constructor(
    public key: string,
    public readonly label: string,
    public type: 'flag' | 'usage' | 'header' | 'detail',
    public readonly children: DetailsNode[] = [],
    public description?: string,
  ) {
    super(label, collapsedMap[type])
    this.contextValue = type
  }
}
