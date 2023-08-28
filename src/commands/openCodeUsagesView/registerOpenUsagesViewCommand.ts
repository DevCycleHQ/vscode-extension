import * as vscode from 'vscode'
import { OPEN_USAGES_VIEW } from './constants'
import { CodeUsageNode } from '../../views/usages/UsagesTree/CodeUsageNode'
import { UsagesTreeProvider } from '../../views/usages'

export async function registerOpenUsagesViewCommand(
    context: vscode.ExtensionContext,
    codeUsagesView: vscode.TreeView<CodeUsageNode>,
    usagesDataProvider: UsagesTreeProvider
) {
    context.subscriptions.push(
        vscode.commands.registerCommand(
            OPEN_USAGES_VIEW,
            async ({ variableKey, folderUri }: { variableKey: string, folderUri?: string }) => {
                try {
                    const activeDocumentUri = (folderUri && vscode.Uri.parse(folderUri)) || vscode.window.activeTextEditor?.document.uri
                    const currentFolder = activeDocumentUri ? vscode.workspace.getWorkspaceFolder(activeDocumentUri) : undefined
                
                    if (!currentFolder) {
                        return
                    }

                    const targetElement = usagesDataProvider.findElementByKeyInFolder(variableKey, currentFolder)
                    if (targetElement) {
                        await codeUsagesView.reveal(targetElement, { select: true, focus: true, expand: true })
                    }
                } catch (error) {
                    console.error("Failed to show variable usages: ", error)
                }
            },
        ),
    )
}
