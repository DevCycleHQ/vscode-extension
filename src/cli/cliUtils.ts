import { KEYS, StateManager } from '../StateManager'
import { Organization } from './baseCLIController'
import { getAllEnvironments, getEnvironment } from './environmentsCLIController'
import {
  Feature,
  FeatureConfiguration,
  getAllFeatures,
  getFeature,
  getFeatureConfigurations,
} from './featuresCLIController'
import {
  Variable,
  getAllVariables,
  getVariable,
} from './variablesCLIController'

export type FeatureConfigurationWithEnvNames = FeatureConfiguration & {
  envName: string
}

export type CombinedVariableData = {
  variable: Variable
  feature?: Feature
  configurations?: FeatureConfigurationWithEnvNames[]
}

export const initStorage = async () => {
  await Promise.all([getAllVariables(), getAllFeatures(), getAllEnvironments()])
}

export const getCombinedVariableDetails = async (
  variable: string | Variable,
) => {
  let fullVariable: Variable
  if (typeof variable === 'string') {
    fullVariable = await getVariable(variable)
  } else {
    fullVariable = variable
  }

  const featureId = fullVariable._feature

  let feature: Feature | undefined
  let featureConfigsWithEnvNames: FeatureConfigurationWithEnvNames[] = []

  if (featureId) {
    const setFeature = async () => {
      feature = await getFeature(featureId)
    }

    const setFeatureConfigsWithEnvNames = async () => {
      const featureConfigurations = await getFeatureConfigurations(featureId)
      await Promise.all(
        featureConfigurations?.map(async (config) => {
          const environment = await getEnvironment(config._environment)
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

export const getOrganizationId = async () => {
  const cachedOrganization = StateManager.getState(KEYS.ORGANIZATION) as Organization
  return cachedOrganization.id
}
