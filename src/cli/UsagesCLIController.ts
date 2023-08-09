import { StateManager, KEYS } from '../StateManager'
import { showBusyMessage, hideBusyMessage } from '../components/statusBarItem'
import { BaseCLIController } from './BaseCLIController'

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
  public async usages(): Promise<JSONMatch[]> {
    showBusyMessage('Finding Devcycle code usages')
    const { output } = await this.execDvc('usages --format=json')
    
    const matches = JSON.parse(output) as JSONMatch[]
    hideBusyMessage()
    StateManager.setFolderState(this.folder.name, KEYS.CODE_USAGE_KEYS, matches.map((match) => match.key))
    return matches
  }
}
