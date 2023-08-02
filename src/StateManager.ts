import * as vscode from 'vscode'
import { Environment, Feature, FeatureConfiguration, Organization, Variable } from './cli'

export const enum KEYS {
  PROJECT_ID = 'project_id',
  PROJECT_NAME = 'project_name',
  FEATURES = 'features',
  VARIABLES = 'variables',
  FEATURE_CONFIGURATIONS = 'feature_configurations',
  ENVIRONMENTS = 'environments',
  ORGANIZATION = 'organization',
  SEND_METRICS_PROMPTED = 'send_metrics_prompted',
  CODE_USAGE_KEYS = 'code_usage_keys',
  EXTENSION_INSTALLED = 'extension_installed',
  REPO_CONFIG = 'repo_config',
}

export class StateManager {
  static workspaceState: vscode.Memento
  static globalState: vscode.Memento

  static clearState() {
    this.workspaceState.keys().forEach((key) => {
      if (
          key !== KEYS.PROJECT_ID &&
          key !== KEYS.PROJECT_NAME &&
          key !== KEYS.ORGANIZATION &&
          key !== KEYS.EXTENSION_INSTALLED
        ) {
        this.workspaceState.update(key, undefined)
      }
    })
  }

  static setState(key: KEYS.PROJECT_ID | KEYS.PROJECT_NAME, value: string | undefined): Thenable<void>
  static setState(key: KEYS.FEATURES, value: Record<string, Feature> | undefined): Thenable<void>
  static setState(key: KEYS.VARIABLES, value: Record<string, Variable> | undefined): Thenable<void>
  static setState(key: KEYS.FEATURE_CONFIGURATIONS, value: Record<string, FeatureConfiguration[]> | undefined): Thenable<void>
  static setState(key: KEYS.ENVIRONMENTS, value: Record<string, Environment> | undefined): Thenable<void>
  static setState(key: KEYS.ORGANIZATION, value: Organization | undefined): Thenable<void>
  static setState(key: KEYS.SEND_METRICS_PROMPTED, value: boolean | undefined): Thenable<void>
  static setState(key: KEYS.CODE_USAGE_KEYS, value: string[] | undefined): Thenable<void>
  static setState(key: KEYS.REPO_CONFIG, value: Record<string, any>): Thenable<void>
  static setState(key: string, value: any) {
    return this.workspaceState.update(key, value)
  }

  static getState(key: KEYS.PROJECT_ID | KEYS.PROJECT_NAME): string | undefined
  static getState(key: KEYS.FEATURES): Record<string, Feature> | undefined
  static getState(key: KEYS.VARIABLES): Record<string, Variable> | undefined
  static getState(key: KEYS.FEATURE_CONFIGURATIONS): Record<string, FeatureConfiguration[]> | undefined
  static getState(key: KEYS.ENVIRONMENTS): Record<string, Environment> | undefined
  static getState(key: KEYS.ORGANIZATION): Organization | undefined
  static getState(key: KEYS.SEND_METRICS_PROMPTED): boolean | undefined
  static getState(key: KEYS.CODE_USAGE_KEYS): string[] | undefined
  static getState(key: KEYS.REPO_CONFIG): Record<string, any> | undefined
  static getState(key: string) {
    return this.workspaceState.get(key)
  }
}
