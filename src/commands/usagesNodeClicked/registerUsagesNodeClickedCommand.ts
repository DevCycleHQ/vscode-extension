import * as vscode from 'vscode'
import { CodeUsageNode } from '../../views/usages/UsagesTree/CodeUsageNode'
import { getOrganizationId } from '../../cli'
import { trackRudderstackEvent } from '../../RudderStackService'
import { COMMAND_USAGES_NODE_CLICKED } from './constants'

export function registerUsagesNodeClickedCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMAND_USAGES_NODE_CLICKED,
      async (node: CodeUsageNode) => {
        const [workspaceFolder] = vscode.workspace.workspaceFolders || []
        const orgId = getOrganizationId(workspaceFolder)
        trackRudderstackEvent('Code Usage Clicked', orgId)
      }
    )
  )
}