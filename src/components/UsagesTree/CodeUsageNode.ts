import * as vscode from 'vscode'
import {
  JSONMatch,
  VariableReference,
  CombinedVariableData,
  getOrganizationId,
} from '../../cli'

import { KEYS, StateManager } from '../../StateManager'

export type VariableCodeReference =
  | (CombinedVariableData & {
      references?: VariableReference[]
    })
  | JSONMatch

const collapsedMap = {
  flag: vscode.TreeItemCollapsibleState.Collapsed,
  usage: vscode.TreeItemCollapsibleState.None,
  detail: vscode.TreeItemCollapsibleState.None,
  header: vscode.TreeItemCollapsibleState.Expanded,
}

export class CodeUsageNode extends vscode.TreeItem {
  static async flagFrom(
    match: VariableCodeReference,
    workspaceRoot: string,
    context: vscode.ExtensionContext,
  ) {
    const children = []
    let references: VariableReference[] | undefined = match.references
    const key = 'key' in match ? match.key : match.variable.key

    if ('variable' in match) {
      const {
        variable,
        feature,
        configurations,
        references: variableReferences,
      } = match
      references = references || variableReferences

      const detailsChildNodes = [
        new CodeUsageNode(
          key + ':status',
          `Status`,
          'detail',
          [],
          variable.status,
        ),
        new CodeUsageNode(key + ':id', `ID`, 'detail', [], variable._id),
        new CodeUsageNode(
          key + ':feature',
          `Feature`,
          'detail',
          [],
          feature?.name || feature?.key || 'Unassociated',
        ),
      ]

      if (variable.description?.length) {
        detailsChildNodes.unshift(
          new CodeUsageNode(
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
          new CodeUsageNode(key + ':name', `Name`, 'detail', [], variable.name),
        )
      }
      if (configurations?.length) {
        const activeEnvironments = configurations
          .filter((config) => config.status === 'active')
          .map((config) => config.envName)

        detailsChildNodes.push(
          new CodeUsageNode(
            key + ':targeting',
            `Active Environments`,
            'detail',
            [],
            activeEnvironments.length ? activeEnvironments.join(', ') : 'None',
          ),
        )
      }
      const orgId = await getOrganizationId()
      const projectId = StateManager.getState(KEYS.PROJECT_ID)
      if (orgId && projectId) {
        const link = `https://app.devcycle.com/o/${orgId}/p/${projectId}/variables/${variable._id}`
        const linkNode = new CodeUsageNode(
          key + ':link',
          `Open In Dashboard ↗`,
          'detail',
          [],
        )
        linkNode.command = {
          title: '',
          command: 'devcycle-featureflags.openLink',
          arguments: [link],
        }
        linkNode.tooltip = link
        detailsChildNodes.push(linkNode)
      }

      const variableDetailsRoot = new CodeUsageNode(
        key,
        'Details',
        'header',
        detailsChildNodes,
      )
      children.push(variableDetailsRoot)
    }

    if (references) {
      const usagesChildNodes = references?.map((reference) =>
        this.usageFrom(match, reference, workspaceRoot),
      )
      const usagesRoot = new CodeUsageNode(
        key,
        'Usages',
        'header',
        usagesChildNodes,
      )
      children.push(usagesRoot)
    }

    const instance = new CodeUsageNode(key, key, 'flag', children)
    instance.key = key
    instance.iconPath = {
      dark: vscode.Uri.joinPath(
        context.extensionUri,
        'media',
        'flag-filled-white.svg',
      ),
      light: vscode.Uri.joinPath(
        context.extensionUri,
        'media',
        'flag-filled.svg',
      ),
    }
    return instance
  }

  static usageFrom(
    match: VariableCodeReference,
    reference: VariableReference,
    workspaceRoot: string,
  ): CodeUsageNode {
    const key = 'key' in match ? match.key : match.variable.key
    const start = reference.lineNumbers.start
    const end = reference.lineNumbers.end
    const label =
      start === end
        ? `${reference.fileName}:L${start}`
        : `${reference.fileName}:L${start}-${end}`
    const instance = new CodeUsageNode(key, label, 'usage')
    const file = vscode.Uri.file(`${workspaceRoot}/${reference.fileName}`)
    instance.command = {
      title: '',
      command: 'devcycle-featureflags.show-reference',
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