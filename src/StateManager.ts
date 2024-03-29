import * as vscode from 'vscode'
import { Environment, Feature, FeatureConfiguration, Organization, Project, Variable } from './cli'
import { RepoConfig } from './utils/loadRepoConfig'

export const enum KEYS {
  LOGGED_IN = 'logged_in',
  REPO_CONFIG = 'repo_config',
  PROJECT_ID = 'project_id',
  PROJECTS = 'projects',
  FEATURES = 'features',
  VARIABLES = 'variables',
  FEATURE_CONFIGURATIONS = 'feature_configurations',
  ENVIRONMENTS = 'environments',
  ORGANIZATION = 'organization',
  ORGANIZATIONS = 'organizations',
  SEND_METRICS_PROMPTED = 'send_metrics_prompted',
  CODE_USAGE_KEYS = 'code_usage_keys',
  EXTENSION_INSTALLED = 'extension_installed',
  AUTH0_USER_ID = 'auth0_user_id',
}

export class StateManager {
  static workspaceState: vscode.Memento
  static globalState: vscode.Memento

  static clearState() {
    this.workspaceState.keys().forEach((key) => {
      if (
        !key.includes(KEYS.PROJECT_ID) &&
        !key.includes(KEYS.ORGANIZATION) &&
        !key.includes(KEYS.AUTH0_USER_ID) &&
        !key.includes(KEYS.LOGGED_IN)
      ) {
        this.workspaceState.update(key, undefined)
      }
    })
  }

  static clearFolderState(folder: string) {
    this.workspaceState.keys().forEach((key) => {
      if (
        key.startsWith(`${folder}.`) &&
        !key.includes(KEYS.PROJECT_ID) &&
        !key.includes(KEYS.ORGANIZATION) &&
        !key.includes(KEYS.AUTH0_USER_ID) &&
        !key.includes(KEYS.LOGGED_IN)
      ) {
        this.workspaceState.update(key, undefined)
      }
    })
  }

  static setGlobalState(key: KEYS.EXTENSION_INSTALLED, value: boolean | undefined): Thenable<void>
  static setGlobalState(key: KEYS.SEND_METRICS_PROMPTED, value: boolean | undefined): Thenable<void>
  static setGlobalState(key: string, value: any) {
    return this.globalState.update(key, value)
  }

  static getGlobalState(key: KEYS.EXTENSION_INSTALLED): boolean | undefined
  static getGlobalState(key: KEYS.SEND_METRICS_PROMPTED): boolean | undefined
  static getGlobalState(key: string) {
    return this.globalState.get(key)
  }

  static setWorkspaceState(key: KEYS.AUTH0_USER_ID, value: string | undefined): Thenable<void>
  static setWorkspaceState(key: KEYS.ORGANIZATIONS, value: Record<string, Organization> | undefined): Thenable<void>
  static setWorkspaceState(key: string, value: any) {
    return this.workspaceState.update(key, value)
  }

  static getWorkspaceState(key: KEYS.AUTH0_USER_ID): string | undefined
  static getWorkspaceState(key: KEYS.ORGANIZATIONS): Record<string, Organization> | undefined
  static getWorkspaceState(key: string) {
    return this.workspaceState.get(key)
  }

  static setFolderState(folder: string, key: KEYS.LOGGED_IN, value: boolean): Thenable<void>
  static setFolderState(folder: string, key: KEYS.REPO_CONFIG, value: RepoConfig): Thenable<void>
  static setFolderState(folder: string, key: KEYS.PROJECT_ID, value: string | undefined): Thenable<void>
  static setFolderState(folder: string, key: KEYS.PROJECTS, value: Record<string, Project> | undefined): Thenable<void>
  static setFolderState(folder: string, key: KEYS.FEATURES, value: Record<string, Feature> | undefined): Thenable<void>
  static setFolderState(folder: string, key: KEYS.VARIABLES, value: Record<string, Variable> | undefined): Thenable<void>
  static setFolderState(folder: string, key: KEYS.FEATURE_CONFIGURATIONS, value: Record<string, FeatureConfiguration[]> | undefined): Thenable<void>
  static setFolderState(folder: string, key: KEYS.ENVIRONMENTS, value: Record<string, Environment> | undefined): Thenable<void>
  static setFolderState(folder: string, key: KEYS.ORGANIZATION, value: Organization | undefined): Thenable<void>
  static setFolderState(folder: string, key: KEYS.CODE_USAGE_KEYS, value: Record<string, boolean> | undefined): Thenable<void>
  static setFolderState(folder: string, key: string, value: any) {
    return this.workspaceState.update(`${folder}.${key}`, value)
  }

  static getFolderState(folder: string, key: KEYS.LOGGED_IN): boolean | undefined
  static getFolderState(folder: string, key: KEYS.REPO_CONFIG): RepoConfig | undefined
  static getFolderState(folder: string, key: KEYS.PROJECT_ID): string | undefined
  static getFolderState(folder: string, key: KEYS.PROJECTS): Record<string, Project> | undefined
  static getFolderState(folder: string, key: KEYS.FEATURES): Record<string, Feature> | undefined
  static getFolderState(folder: string, key: KEYS.VARIABLES): Record<string, Variable> | undefined
  static getFolderState(folder: string, key: KEYS.FEATURE_CONFIGURATIONS): Record<string, FeatureConfiguration[]> | undefined
  static getFolderState(folder: string, key: KEYS.ENVIRONMENTS): Record<string, Environment> | undefined
  static getFolderState(folder: string, key: KEYS.ORGANIZATION): Organization | undefined
  static getFolderState(folder: string, key: KEYS.SEND_METRICS_PROMPTED): boolean | undefined
  static getFolderState(folder: string, key: KEYS.CODE_USAGE_KEYS): Record<string, boolean> | undefined
  static getFolderState(folder: string, key: string) {
    return this.workspaceState.get(`${folder}.${key}`)
  }
}
