import * as vscode from 'vscode'
import { COMMAND_COPY_TO_CLIPBOARD } from './constants'

export async function registerCopyToClipboardCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMAND_COPY_TO_CLIPBOARD,
      async (item: Pick<CopyableNode, 'value' | 'copyMessage'>) => {
        await vscode.env.clipboard.writeText(item.value)
        vscode.window.showInformationMessage(item.copyMessage || 'Copied to clipboard')
      },
    ),
  )
}

export class CopyableNode extends vscode.TreeItem {
  copyMessage?: string

  constructor(
    label: string,
    public value: string
  ) {
    super(label)
    this.contextValue = 'copyToClipboard'
  }
}
