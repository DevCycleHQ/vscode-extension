import * as vscode from 'vscode'
import { StateManager, KEYS } from '../StateManager'
import { showBusyMessage, hideBusyMessage } from '../components/statusBarItem'
import { Organization, OrganizationsCLIController } from './OrganizationsCLIController'
import { BaseCLIController } from './BaseCLIController'
import utils from '../utils'

export class AuthCLIController extends BaseCLIController {
  organizationsController: OrganizationsCLIController

  constructor(folder: vscode.WorkspaceFolder) {
    super(folder)
    this.organizationsController = new OrganizationsCLIController(folder)
  }

  public async init(organization: Organization) {
    showBusyMessage('Initializing DevCycle')
    const { code, error } = await this.execDvc(`repo init --org=${organization.name}`)
    if (code !== 0) {
      throw error
    }
    hideBusyMessage()
  }
  
  public async login() {
    showBusyMessage('Logging into DevCycle')
  
    try {
      await utils.loadRepoConfig(this.folder)
      const isLoggedIn = await this.isLoggedIn()

      if (!isLoggedIn) {
        const orgFromConfig = await this.organizationsController.selectOrganizationFromConfig()

        if (!orgFromConfig) {
          const { error, output: orgResponse } = await this.execDvc('organizations get')
          if (error) throw error
          const organizations = JSON.parse(orgResponse) as Organization[]

          await this.organizationsController.selectOrganizationFromList(organizations)
        }
      }

      const { repoConfigExists, a0UserId } = await this.status()
      StateManager.setWorkspaceState(KEYS.AUTH0_USER_ID, a0UserId)

      const initRepoOnLogin = vscode.workspace
        .getConfiguration('devcycle-feature-flags')
        .get('initRepoOnLogin')
      const org = StateManager.getFolderState(this.folder.name, KEYS.ORGANIZATION)
      if (!repoConfigExists && initRepoOnLogin && org) {
        await this.init(org)
      }
      StateManager.setFolderState(this.folder.name, KEYS.LOGGED_IN, true)
    } catch (e) {
      StateManager.setFolderState(this.folder.name, KEYS.LOGGED_IN, false)
      if (e instanceof Error) {
        utils.showDebugOutput(`Login failed ${e.message}`)
        throw e
      }
    } finally {
      hideBusyMessage()
    }
  }

  public async logout() {
    const { code, error } = await this.execDvc('logout')
    if (code === 0) {
      vscode.window.showInformationMessage('Logged out of DevCycle')
      StateManager.setFolderState(this.folder.name, KEYS.LOGGED_IN, false)
    } else {
      vscode.window.showInformationMessage(`Logout failed ${error?.message}}`)
    }
  }

  public async isLoggedIn() {
    const projectId = StateManager.getFolderState(this.folder.name, KEYS.PROJECT_ID)
    const organization = StateManager.getFolderState(this.folder.name, KEYS.ORGANIZATION)

    if (!projectId || !organization) return false

    const { hasAccessToken } = await this.status()
    return hasAccessToken
  }
}
