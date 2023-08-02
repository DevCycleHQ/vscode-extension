import * as vscode from 'vscode'

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
}

export class StateManager {
  static workspaceState: vscode.Memento
  static globalState: vscode.Memento

  static clearState() {
    this.workspaceState.keys().forEach((key) => {
      if (key !== KEYS.ORGANIZATION && key !== KEYS.PROJECT_ID && key !== KEYS.PROJECT_NAME) {
        this.workspaceState.update(key, undefined)
      }
    })
  }

  static setState(key: string, value: any) {
    return this.workspaceState.update(key, value)
  }

  static getState(key: string) {
    return this.workspaceState.get(key)
  }
}
