import * as vscode from 'vscode'
import { Environment, SDKKey, getOrganizationId } from '../../cli'
import { COMMAND_COPY_TO_CLIPBOARD, COMMAND_OPEN_LINK, CopyableNode } from '../../commands'

export class EnvironmentNode extends vscode.TreeItem {
  keys: KeyListNode
  link: LinkNode

  constructor(folder: vscode.WorkspaceFolder, environment: Environment) {
    super(environment.name, vscode.TreeItemCollapsibleState.Collapsed)
    const orgId = getOrganizationId(folder)
    this.keys = new KeyListNode(environment)
    this.link = new LinkNode(orgId)
  }
}

export class KeyListNode extends vscode.TreeItem {
  children: vscode.TreeItem[]
  constructor(environment: Environment) {
    super('Keys', vscode.TreeItemCollapsibleState.Collapsed)
    const { sdkKeys, name } = environment
    this.iconPath = new vscode.ThemeIcon('key')
    this.children = [
      ...KeyNode.fromKeys(name, sdkKeys.mobile, 'Mobile Key'),
      ...KeyNode.fromKeys(name, sdkKeys.client, 'Client Key'),
      ...KeyNode.fromKeys(name, sdkKeys.server, 'Server Key'),
    ]
  }
}

export class KeyNode extends CopyableNode {
  constructor(envName: string, label: string, key: string) {
    super(label, key)
    this.tooltip = `Copy ${label}`
    this.copyMessage = `Copied ${envName} ${label} to clipboard`
    this.command = {
      command: COMMAND_COPY_TO_CLIPBOARD,
      title: this.tooltip,
      arguments: [this]
    }
  }

  static fromKeys(envName: string, keys: SDKKey[], label: string) {
    return keys.map(({ key, createdAt }) => {
      const dateFormatter = new Intl.DateTimeFormat('en-US', {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit'
      })
      const date = dateFormatter.format(new Date(createdAt))
      const nodeLabel = keys.length > 1 ? `${label} ${date}` : label
      return new KeyNode(envName, nodeLabel, key)
    })
  }
}

export class LinkNode extends vscode.TreeItem {
  constructor(orgId: string | undefined) {
    const title = 'View in Dashboard'
    super(title)
    this.iconPath = new vscode.ThemeIcon('globe')
    const url = orgId
      ? `https://app.devcycle.com/o/${orgId}/settings/environments`
      : 'https://app.devcycle.com/r/environments'
    this.command = {
      command: COMMAND_OPEN_LINK,
      title,
      arguments: [url],
    }
  }
}
