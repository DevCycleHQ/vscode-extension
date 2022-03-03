import * as vscode from "vscode";


export const enum KEYS {
  ACCESS_TOKEN = "access_token",
  PROJECT_ID = "project_id",
  FEATURE_FLAGS = "feature_flags"
};

export class GlobalStateManager {
  static globalState: vscode.Memento;

  static clearState(){
    this.globalState.update(KEYS.ACCESS_TOKEN, "");
    this.globalState.update(KEYS.PROJECT_ID, "");
    this.globalState.update(KEYS.FEATURE_FLAGS, []);
  }

  static setState(key: KEYS, token: string) {
    console.log(key, token);
    return this.globalState.update(key, token);
  }

  static getState(key: KEYS) {
    return this.globalState.get(key);
  }
}
