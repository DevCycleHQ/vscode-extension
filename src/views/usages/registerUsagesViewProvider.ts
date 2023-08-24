import * as vscode from 'vscode'
import { UsagesTreeProvider } from './UsagesTree'
import { getOrganizationId } from '../../cli'
import { trackRudderstackEvent } from '../../RudderStackService'
import { CodeUsageNode } from './UsagesTree/CodeUsageNode'

export async function registerUsagesViewProvider(context: vscode.ExtensionContext) {
  const usagesDataProvider = new UsagesTreeProvider(context)

  const usagesTreeView = vscode.window.createTreeView(
    'devcycle-code-usages',
    { treeDataProvider: usagesDataProvider },
  )
  usagesTreeView.onDidChangeVisibility(async (e) => {
    const [workspaceFolder] = vscode.workspace.workspaceFolders || []
    const orgId = getOrganizationId(workspaceFolder)
    trackRudderstackEvent('Usages Viewed', orgId)
  })

  usagesTreeView.onDidChangeSelection((e) => {
    const node = e.selection[0]
    if (node instanceof CodeUsageNode && node.type === 'usage') {
      vscode.commands.executeCommand(
        'devcycle-featureflags.usagesNodeClicked',
        node
      )
    }
  })

  return { usagesDataProvider, usagesTreeView }
}