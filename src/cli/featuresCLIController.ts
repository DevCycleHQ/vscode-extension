import * as vscode from 'vscode'
import { KEYS, StateManager } from '../StateManager'
import { execDvc } from './baseCLIController'

export type Feature = {
  key: string
  _id: string
  name: string
}

export type FeatureConfiguration = {
  key: string
  _id: string
  status: string
  _environment: string
}

export type FeatureConfigurationsByFeatureId = Record<
  string,
  FeatureConfiguration[]
>

export async function getFeature(featureId: string) {
  const features =
    (StateManager.getState(KEYS.FEATURES) as Record<string, Feature>) || {}
  const feature = features[featureId]
  if (feature) {
    return feature
  }
  const { code, error, output } = await execDvc(
    `features get --keys='${featureId}'`,
  )
  if (code !== 0) {
    vscode.window.showErrorMessage(
      `Retrieving feature ${featureId} failed: ${error?.message}}`,
    )
    return
  } else {
    // add the missing feature to the state
    const featuresResult = JSON.parse(output)
    if (!featuresResult || !featuresResult.length) {
      return
    }
    const feature = featuresResult[0]
    features[featureId] = feature
    StateManager.setState(KEYS.FEATURES, features)
    return feature
  }
}

export async function getAllFeatures() {
  const features = StateManager.getState(KEYS.FEATURES) as Record<
    string,
    Feature
  >
  if (features) {
    return features
  }
  const { code, error, output } = await execDvc('features get')
  if (code !== 0) {
    vscode.window.showErrorMessage(
      `Retrieving features failed: ${error?.message}}`,
    )
    return []
  } else {
    const features = JSON.parse(output) as Feature[]
    const featureMap = features.reduce((result, currentFeature) => {
      result[currentFeature._id] = currentFeature
      return result
    }, {} as Record<string, Feature>)

    StateManager.setState(KEYS.FEATURES, featureMap)
    return featureMap
  }
}

export async function getFeatureConfigurations(featureId: string) {
  const featureConfigsMap =
    (StateManager.getState(
      KEYS.FEATURE_CONFIGURATIONS,
    ) as FeatureConfigurationsByFeatureId) || {}
  const featureConfigs = featureConfigsMap[featureId]
  if (featureConfigs) {
    return featureConfigs
  }

  const { code, error, output } = await execDvc(`targeting get ${featureId}`)
  if (code !== 0) {
    vscode.window.showErrorMessage(
      `Retrieving feature configurations for ${featureId} failed: ${error?.message}}`,
    )
    return []
  } else {
    // add the missing feature configs to the state
    const featureConfigs = JSON.parse(output)
    featureConfigsMap[featureId] = featureConfigs
    StateManager.setState(KEYS.FEATURE_CONFIGURATIONS, featureConfigsMap)
    return featureConfigs as FeatureConfiguration[]
  }
}
