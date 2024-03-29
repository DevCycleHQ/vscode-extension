import { StateManager, KEYS } from '../StateManager'
import { showBusyMessage, hideBusyMessage } from '../components/statusBarItem'
import { BaseCLIController } from './BaseCLIController'
import * as vscode from 'vscode'

export type JSONMatch = {
  key: string
  references: VariableReference[]
}

export type VariableReference = {
  codeSnippet: CodeSnippet
  lineNumbers: Range
  fileName: string
  language: string
}

export type CodeSnippet = {
  lineNumbers: Range
  content: string
}

export type Range = {
  start: number
  end: number
}

export class UsagesCLIController extends BaseCLIController {
  public async usagesKeys() {
    const usagesKeys = StateManager.getFolderState(
      this.folder.name,
      KEYS.CODE_USAGE_KEYS,
    )
    if (usagesKeys) {
      return usagesKeys
    }
    await this.usages()
    return (
      StateManager.getFolderState(this.folder.name, KEYS.CODE_USAGE_KEYS) || {}
    )
  }

  public async usages(savedFilePath?: string): Promise<JSONMatch[]> {
    showBusyMessage('Finding Devcycle code usages')
    const { code, error, output } = await this.execDvc(
      `usages --format=json${
        savedFilePath ? ` --include=${savedFilePath}` : ''
      }`,
    )
    hideBusyMessage()

    if (code !== 0) {
      vscode.window.showErrorMessage(
        `Error finding code usages: ${error?.message}}`,
      )
      return []
    } else {
      const matches = JSON.parse(output) as JSONMatch[]
      const codeUsageKeys = matches.reduce(
        (map, match) => {
          map[match.key] = true
          return map
        },
        {} as Record<string, boolean>,
      )
      StateManager.setFolderState(
        this.folder.name,
        KEYS.CODE_USAGE_KEYS,
        codeUsageKeys,
      )
    return matches
    }
  }
}
