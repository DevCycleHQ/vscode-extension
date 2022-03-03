import * as vscode from "vscode";


export const enum KEYS {
  ACCESS_TOKEN = "access_token",
  PROJECT_ID = "project_id"
};

export class GlobalStateManager {
  static globalState: vscode.Memento;

  static clearState(){
    this.globalState.update(KEYS.ACCESS_TOKEN, "");
    this.globalState.update(KEYS.PROJECT_ID, "");
    this.globalState.update("featureFlags", []);
  }

  static setState(key: KEYS, token: string) {
    console.log(key, token);
    return this.globalState.update(key, token);
  }

  static setStateAny(key: string, token: string[]) {
    console.log(key, token);
    return this.globalState.update(key, token);
  }

  static getState(key: KEYS) {
    return this.globalState.get(key);
  }

  static getStateAny(key: string): any {
    return this.globalState.get(key);
  }
}
