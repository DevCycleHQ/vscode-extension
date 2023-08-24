import * as vscode from 'vscode'
import { KEYS, StateManager } from '../StateManager'
import { EnvironmentsCLIController } from './EnvironmentsCLIController'
import {
  FeatureConfiguration,
  FeaturesCLIController,
} from './FeaturesCLIController'
import {
  Variable,
  VariablesCLIController,
} from './VariablesCLIController'
import { Feature } from '../../dvc/dist/api/schemas'

export type FeatureConfigurationWithEnvNames = FeatureConfiguration & {
  envName: string
}

export type CombinedVariableData = {
  variable: Variable
  feature?: Feature
  configurations?: FeatureConfigurationWithEnvNames[]
}

export const getCombinedVariableDetails = async (
  folder: vscode.WorkspaceFolder,
  variable: string | Variable,
  skipConfigurations: boolean = false
) => {
  const variablesCLIController = new VariablesCLIController(folder)
  const featuresCLIController = new FeaturesCLIController(folder)
  const environmentsCLIController = new EnvironmentsCLIController(folder)

  let fullVariable: Variable
  if (typeof variable === 'string') {
    fullVariable = await variablesCLIController.getVariable(variable)
  } else {
    fullVariable = variable
  }

  const featureId = fullVariable._feature

  let feature: Feature | undefined
  let featureConfigsWithEnvNames: FeatureConfigurationWithEnvNames[] = []

  if (featureId) {
    const setFeature = async () => {
      feature = await featuresCLIController.getFeature(featureId)
    }

    const setFeatureConfigsWithEnvNames = async () => {
      if (skipConfigurations) return
      const featureConfigurations = await featuresCLIController.getFeatureConfigurations(featureId)
      await Promise.all(
        featureConfigurations?.map(async (config) => {
          const environment = await environmentsCLIController.getEnvironment(config._environment)
          featureConfigsWithEnvNames.push({
            ...config,
            envName: environment?.name || '',
          })
          return environment
        }),
      )
    }

    await Promise.all([setFeature(), setFeatureConfigsWithEnvNames()])
  }

  return {
    variable: fullVariable,
    feature,
    configurations: featureConfigsWithEnvNames,
  }
}

export const getOrganizationId = (folder: vscode.WorkspaceFolder) => {
  const cachedOrganization = StateManager.getFolderState(folder.name, KEYS.ORGANIZATION)
  return cachedOrganization?.id
}
