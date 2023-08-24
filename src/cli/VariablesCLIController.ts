import * as vscode from 'vscode'
import { KEYS, StateManager } from '../StateManager'
import { BaseCLIController } from './BaseCLIController'

export type Variable = {
  key: string
  _feature: string
  _id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  status: 'active' | 'archived'
}

export class VariablesCLIController extends BaseCLIController {
  public async getVariable(variableKey: string) {
    const variables = StateManager.getFolderState(this.folder.name, KEYS.VARIABLES) || {}
    const variable = variables[variableKey]
    if (variable) {
      return variable
    }
  
    const { code, error, output } = await this.execDvc(
      `variables get --keys='${variableKey}'`,
    )
    if (code !== 0) {
      vscode.window.showErrorMessage(
        `Retrieving feature ${variableKey} failed: ${error?.message}}`,
      )
      return
    } else {
      // add the missing variable to the state
      const variablesResult = JSON.parse(output)
      if (!variablesResult || !variablesResult.length) {
        return
      }
      const variable = variablesResult[0]
      variables[variableKey] = variable
      StateManager.setFolderState(this.folder.name, KEYS.VARIABLES, variables)
      return variable
    }
  }
  
  public async getAllVariables() {
    const variables = StateManager.getFolderState(this.folder.name, KEYS.VARIABLES)
    if (variables) {
      return variables
    }
    const { code, error, output } = await this.execDvc('variables get')
    if (code !== 0) {
      vscode.window.showErrorMessage(
        `Retrieving variables failed: ${error?.message}}`,
      )
      return {}
    } else {
      const variables = JSON.parse(output) as Variable[]
      const variableMap = variables.reduce((result, currentVariable) => {
        result[currentVariable.key] = currentVariable
        return result
      }, {} as Record<string, Variable>)
  
      StateManager.setFolderState(this.folder.name, KEYS.VARIABLES, variableMap)
      return variableMap
    }
  }
}
