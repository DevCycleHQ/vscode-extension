import * as vscode from 'vscode'
import { SortCriteria } from './constants'
import { UsagesTreeProvider } from '../../views/usages'

export const registerSortUsagesCommand = (
    context: vscode.ExtensionContext,
    usagesDataProvider: UsagesTreeProvider
  ) => {
    context.subscriptions.push(
        vscode.commands.registerCommand('devcycle-code-usages.sortByKey', async () => {
            setSortKeyAndSort(usagesDataProvider, SortCriteria.KEY)
        })
    )
    context.subscriptions.push(
        vscode.commands.registerCommand('devcycle-code-usages.sortByCreatedAt', async () => {
            setSortKeyAndSort(usagesDataProvider, SortCriteria.CREATED_AT)

        })
    )
    context.subscriptions.push(
        vscode.commands.registerCommand('devcycle-code-usages.sortByUpdatedAt', async () => {
            setSortKeyAndSort(usagesDataProvider, SortCriteria.UPDATED_AT)
        })
    )
}

const setSortKeyAndSort = (usagesDataProvider: UsagesTreeProvider, criteria: SortCriteria) => {
    if (usagesDataProvider.sortKey === criteria) {
        usagesDataProvider.sortAsc = !usagesDataProvider.sortAsc
    } else {
        usagesDataProvider.sortAsc = true
    }
    usagesDataProvider.sortKey = criteria
    usagesDataProvider.sortData()
}