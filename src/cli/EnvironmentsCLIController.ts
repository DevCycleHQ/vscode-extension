import * as vscode from 'vscode'
import { KEYS, StateManager } from '../StateManager'
import { BaseCLIController } from './BaseCLIController'

export type SDKKey = {
  key: string
  compromised: boolean
  createdAt: string
}

export type Environment = {
  name: string
  _id: string
  key: string
  type: 'development' | 'staging' | 'production' | 'disaster_recovery'
  sdkKeys: {
    mobile: SDKKey[]
    client: SDKKey[]
    server: SDKKey[]
  }
}

export class EnvironmentsCLIController extends BaseCLIController {
  public async getEnvironment(environmentId: string) {
    const environments = StateManager.getFolderState(this.folder.name, KEYS.ENVIRONMENTS) || {}
    const environment = environments[environmentId]
    if (environment) {
      return environment
    }
  
    const { code, error, output } = await this.execDvc(
      `environments get --keys='${environmentId}'`,
    )
    if (code !== 0) {
      vscode.window.showErrorMessage(
        `Retrieving environment ${environmentId} failed: ${error?.message}}`,
      )
      return
    } else {
      // add the missing variable to the state
      const environmentsResult = JSON.parse(output)
      if (!environmentsResult || !environmentsResult.length) {
        return
      }
      const environment = environmentsResult[0]
  
      environments[environmentId] = environment
      StateManager.setFolderState(this.folder.name, KEYS.ENVIRONMENTS, environments)
      return environment
    }
  }
  
  public async getAllEnvironments() {
    const environments = StateManager.getFolderState(this.folder.name, KEYS.ENVIRONMENTS)
    if (environments) {
      return environments
    }
    const { code, error, output } = await this.execDvc('environments get')
    if (code !== 0) {
      vscode.window.showErrorMessage(
        `Retrieving environments failed: ${error?.message}}`,
      )
      return []
    } else {
      const environments = JSON.parse(output) as Environment[]
      const environmentMap = environments.reduce((result, currentEnvironment) => {
        result[currentEnvironment._id] = currentEnvironment
        return result
      }, {} as Record<string, Environment>)
  
      StateManager.setFolderState(this.folder.name, KEYS.ENVIRONMENTS, environmentMap)
      return environmentMap
    }
  }
}
