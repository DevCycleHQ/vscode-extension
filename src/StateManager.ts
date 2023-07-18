import * as vscode from "vscode";


export const enum KEYS {
  ACCESS_TOKEN = "access_token",
  PROJECT_ID = "project_id",
  PROJECT_NAME = "project_name",
  FEATURE_FLAGS = "feature_flags"
};

export class StateManager {
  static workspaceState: vscode.Memento;
  static globalState: vscode.Memento;

  static clearState(){
    this.workspaceState.keys().forEach((key) => {
      if (key !== KEYS.ACCESS_TOKEN && key !== KEYS.PROJECT_ID && key !== KEYS.PROJECT_NAME) {
        this.workspaceState.update(key, undefined)
      }
    })
  }

  static setState(key: string, value: any) {
    return this.workspaceState.update(key, value);
  }

  static getState(key: string) {
    return this.workspaceState.get(key);
  }
}
