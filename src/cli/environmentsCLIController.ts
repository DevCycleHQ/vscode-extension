import * as vscode from 'vscode'
import { KEYS, StateManager } from '../StateManager'
import { execDvc } from './baseCLIController'

export type Environment = {
  name: string
  _id: string
}

export async function getEnvironment(environmentId: string) {
  const environments = (StateManager.getState(KEYS.ENVIRONMENTS) ||
    {}) as Record<string, Environment>
  const environment = environments[environmentId]
  if (environment) {
    return environment
  }

  const { code, error, output } = await execDvc(
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
    StateManager.setState(KEYS.ENVIRONMENTS, environments)
    return environment
  }
}

export async function getAllEnvironments() {
  const environments = StateManager.getState(KEYS.ENVIRONMENTS) as Record<
    string,
    Environment
  >
  if (environments) {
    return environments
  }
  const { code, error, output } = await execDvc('environments get')
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

    StateManager.setState(KEYS.ENVIRONMENTS, environmentMap)
    return environmentMap
  }
}
