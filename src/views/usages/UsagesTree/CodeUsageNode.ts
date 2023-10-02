import * as vscode from 'vscode'
import {
  JSONMatch,
  VariableReference,
  getOrganizationId,
  Variable,
} from '../../../cli'
import path from 'path'

import { KEYS, StateManager } from '../../../StateManager'
import { OPEN_INSPECTOR_VIEW } from '../../../commands'

export type VariableCodeReference = JSONMatch & { variable?: Variable }

const collapsedMap = {
  flag: vscode.TreeItemCollapsibleState.Collapsed,
  usage: vscode.TreeItemCollapsibleState.None,
  detail: vscode.TreeItemCollapsibleState.None,
  header: vscode.TreeItemCollapsibleState.Expanded,
}

export class CodeUsageNode extends vscode.TreeItem {
  static async flagFrom(
    match: VariableCodeReference,
    folder: vscode.WorkspaceFolder,
    context: vscode.ExtensionContext,
  ) {
    const children = []
    const { key, references, variable } = match
    const folderUri = folder.uri.fsPath
    if (!variable) {
      const notFoundNode = new CodeUsageNode(key + ':not-found', '', 'detail')
      notFoundNode.description = 'VARIABLE NOT FOUND IN DEVCYCLE'
      children.push(notFoundNode)
    } else {
      const detailsChildNodes = [
        new CodeUsageNode(
          key + ':createdAt',
          `Created Date`,
          'detail',
          [],
          variable.createdAt,
        ),
        new CodeUsageNode(
          key + ':updatedAt',
          `Updated Date`,
          'detail',
          [],
          variable.updatedAt,
        ),
      ]

      if (variable.name) {
        detailsChildNodes.unshift(
          new CodeUsageNode(key + ':name', `Name`, 'detail', [], variable.name),
        )
      }

      const variableDetailsRoot = new CodeUsageNode(
        key,
        'Details',
        'header',
        detailsChildNodes,
      )
      children.push(variableDetailsRoot)
    }

    const usagesChildNodes = references.map((reference) =>
      this.usageFrom(match, reference, folderUri),
    )
    const usagesRoot = new CodeUsageNode(
      key,
      'Usages',
      'header',
      usagesChildNodes,
    )
    children.push(usagesRoot)

    if (variable) {
      const inspectorLinkNode = new CodeUsageNode(
        key + ':link',
        `Inspector`,
        'detail',
        [],
      )
      inspectorLinkNode.command = {
        title: '',
        command: OPEN_INSPECTOR_VIEW,
        arguments: [
          { buttonType: 'details', variableKey: variable.key, folderUri },
        ],
      }
      inspectorLinkNode.iconPath = {
        dark: vscode.Uri.joinPath(
          context.extensionUri,
          'media',
          'inspector-white.svg',
        ),
        light: vscode.Uri.joinPath(
          context.extensionUri,
          'media',
          'inspector.svg',
        ),
      }
      children.push(inspectorLinkNode)
    }

    const instance = new CodeUsageNode(key, key, 'flag', children)
    instance.key = key
    instance.iconPath = {
      dark: vscode.Uri.joinPath(
        context.extensionUri,
        'media',
        variable ? 'flag-filled-white.svg' : 'flag-filled-white-red-dot.svg',
      ),
      light: vscode.Uri.joinPath(
        context.extensionUri,
        'media',
        variable ? 'flag-filled.svg' : 'flag-filled-red-dot.svg',
      ),
    }
    return instance
  }

  static usageFrom(
    match: VariableCodeReference,
    reference: VariableReference,
    folderPath: string,
  ): CodeUsageNode {
    const { key } = match
    const start = reference.lineNumbers.start
    const end = reference.lineNumbers.end
    const label = path.basename(reference.fileName)
    const instance = new CodeUsageNode(key, label, 'usage')
    const file = vscode.Uri.file(`${folderPath}/${reference.fileName}`) 
    instance.description = start === end ? `L${start}` : `L${start}-${end}`
    instance.command = {
      title: '',
      command: 'devcycle-feature-flags.show-reference',
      arguments: [file, start, end],
    }
    return instance
  }

  constructor(
    public key: string,
    public readonly label: string,
    public type: 'flag' | 'usage' | 'header' | 'detail',
    public readonly children: CodeUsageNode[] = [],
    public description?: string,
  ) {
    super(label, collapsedMap[type])
    this.contextValue = type
  }
}
