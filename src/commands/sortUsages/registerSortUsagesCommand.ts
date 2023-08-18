import * as vscode from 'vscode'
import { SortCriteria } from './constants'
import { UsagesTreeProvider } from '../../views/usages'

export const registerSortUsagesCommand = (
    context: vscode.ExtensionContext,
    usagesDataProvider: UsagesTreeProvider
  ) => {
    context.subscriptions.push(
        vscode.commands.registerCommand('devcycle-code-usages.sortByKey', async () => {
            usagesDataProvider.sortKey = SortCriteria.KEY
            usagesDataProvider.sortData()

        })
    )
    context.subscriptions.push(
        vscode.commands.registerCommand('devcycle-code-usages.sortByCreatedAt', async () => {
            usagesDataProvider.sortKey = SortCriteria.CREATED_AT
            usagesDataProvider.sortData()

        })
    )
    context.subscriptions.push(
        vscode.commands.registerCommand('devcycle-code-usages.sortByUpdatedAt', async () => {
            usagesDataProvider.sortKey = SortCriteria.UPDATED_AT
            usagesDataProvider.sortData()

        })
    )
}