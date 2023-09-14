import * as vscode from 'vscode'
import { KEYS, StateManager } from '../StateManager'
import { EnvironmentsCLIController } from './EnvironmentsCLIController'
import {
  Feature,
  FeatureConfiguration,
  FeaturesCLIController,
} from './FeaturesCLIController'
import {
  Variable,
  VariablesCLIController,
} from './VariablesCLIController'

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
) => {
  const variablesCLIController = new VariablesCLIController(folder)
  const featuresCLIController = new FeaturesCLIController(folder)

  let fullVariable: Variable
  if (typeof variable === 'string') {
    fullVariable = await variablesCLIController.getVariable(variable)
  } else {
    fullVariable = variable
  }

  const featureId = fullVariable._feature
  let feature: Feature | undefined

  if (featureId) {
    feature = await featuresCLIController.getFeature(featureId)
  }

  return {
    variable: fullVariable,
    feature
  }
}

export const getOrganizationId = (folder: vscode.WorkspaceFolder) => {
  const cachedOrganization = StateManager.getFolderState(folder.name, KEYS.ORGANIZATION)
  return cachedOrganization?.id
}
