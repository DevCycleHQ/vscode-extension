import * as vscode from 'vscode'
import { KEYS, StateManager } from '../StateManager'
import { BaseCLIController } from './BaseCLIController'

export type Feature = {
  key: string
  _id: string
  name: string
  variations: Record<string, any>[]
  variables: Record<string, any>[]
}

export type FeatureConfiguration = {
  key: string
  _id: string
  status: string
  _environment: string
}

export class FeaturesCLIController extends BaseCLIController {
  public async getFeature(featureId: string) {
    const features = StateManager.getFolderState(this.folder.name, KEYS.FEATURES) || {}
    const feature = features[featureId]
    if (feature) {
      return feature
    }
    const { code, error, output } = await this.execDvc(
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
      StateManager.setFolderState(this.folder.name, KEYS.FEATURES, features)
      return feature
    }
  }
  
  public async getAllFeatures() {
    const features = StateManager.getFolderState(this.folder.name, KEYS.FEATURES)
    if (features) {
      return features
    }
    const { code, error, output } = await this.execDvc('features get')
    if (code !== 0) {
      vscode.window.showErrorMessage(
        `Retrieving features failed: ${error?.message}}`,
      )
      return {}
    } else {
      const features = JSON.parse(output) as Feature[]
      const featureMap = features.reduce((result, currentFeature) => {
        result[currentFeature._id] = currentFeature
        return result
      }, {} as Record<string, Feature>)
  
      StateManager.setFolderState(this.folder.name, KEYS.FEATURES, featureMap)
      return featureMap
    }
  }
  
  public async getFeatureConfigurations(featureId: string) {
    const featureConfigsMap = StateManager.getFolderState(this.folder.name,  KEYS.FEATURE_CONFIGURATIONS) || {}
    const featureConfigs = featureConfigsMap[featureId]
    if (featureConfigs) {
      return featureConfigs
    }
  
    const { code, error, output } = await this.execDvc(`targeting get ${featureId}`)
    if (code !== 0) {
      vscode.window.showErrorMessage(
        `Retrieving feature configurations for ${featureId} failed: ${error?.message}}`,
      )
      return []
    } else {
      // add the missing feature configs to the state
      const featureConfigs = output ? JSON.parse(output) : output
      featureConfigsMap[featureId] = featureConfigs
      StateManager.setFolderState(this.folder.name, KEYS.FEATURE_CONFIGURATIONS, featureConfigsMap)
      return featureConfigs as FeatureConfiguration[]
    }
  }
}
