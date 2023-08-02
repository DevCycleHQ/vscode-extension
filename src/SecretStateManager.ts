import * as vscode from 'vscode'
import { StateManager } from './StateManager'

export const enum CLIENT_KEYS {
  CLIENT_ID = 'client_id',
  CLIENT_SECRET = 'client_secret',
}

export class SecretStateManager {
  private static _instance: SecretStateManager
  private secretStorage: vscode.SecretStorage
  constructor(private secrets: vscode.SecretStorage) {
    this.secretStorage = secrets
  }
  static init(context: vscode.ExtensionContext): void {
    /*
    Create instance of new AuthSettings.
    */
    SecretStateManager._instance = new SecretStateManager(context.secrets)
  }

  static get instance(): SecretStateManager {
    /*
        Getter of our SecretStateManager existing instance.
        */
    return SecretStateManager._instance
  }

  async clearSecrets() {
    this.secretStorage.store(CLIENT_KEYS.CLIENT_ID, '')
    this.secretStorage.store(CLIENT_KEYS.CLIENT_SECRET, '')
  }

  async setSecret(key: CLIENT_KEYS, value: string) {
    return this.secretStorage.store(key, value)
  }

  async getSecret(key: CLIENT_KEYS) {
    return this.secretStorage.get(key)
  }
}
