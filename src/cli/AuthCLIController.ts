import * as vscode from 'vscode'
import { StateManager, KEYS } from '../StateManager'
import { showBusyMessage, hideBusyMessage } from '../components/statusBarItem'
import { Organization, OrganizationsCLIController } from './OrganizationsCLIController'
import { loadRepoConfig, showDebugOutput } from '../utils'
import { BaseCLIController } from './BaseCLIController'
import { executeRefreshAllCommand } from '../commands'

export class AuthCLIController extends BaseCLIController {
  organizationsController: OrganizationsCLIController

  constructor(folder: vscode.WorkspaceFolder) {
    super(folder)
    this.organizationsController = new OrganizationsCLIController(folder)
  }

  public async init() {
    showBusyMessage('Initializing DevCycle')
    const { code, error, output } = await this.execDvc('repo init')
    if (code !== 0) {
      vscode.window.showErrorMessage(`Login failed ${error?.message}}`)
    }
    hideBusyMessage()
    const organizations = JSON.parse(output) as Organization[]
    await this.organizationsController.selectOrganizationFromList(organizations)
    await executeRefreshAllCommand(this.folder)
    vscode.window.showInformationMessage('DevCycle Configured')
  }
  
  public async login() {
    showBusyMessage('Logging into DevCycle')
  
    try {
      await loadRepoConfig(this.folder)
      StateManager.setFolderState(this.folder.name, KEYS.ORGANIZATION, undefined)
      StateManager.setFolderState(this.folder.name, KEYS.PROJECT_ID, undefined)

      const orgFromConfig = await this.organizationsController.selectOrganizationFromConfig()

      if (!orgFromConfig) {
        const { error, output: orgResponse } = await this.execDvc('organizations get')
        if (error) throw error
        const organizations = JSON.parse(orgResponse) as Organization[]

        await this.organizationsController.selectOrganizationFromList(organizations)
      }
  
      const cliStatus = await this.status()
      const auth0UserId = cliStatus.a0UserId
      StateManager.setWorkspaceState(KEYS.AUTH0_USER_ID, auth0UserId)
      vscode.window.showInformationMessage('Logged in to DevCycle')
    } catch (e) {
      if (e instanceof Error) {
        showDebugOutput(`Login failed ${e.message}`)
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
    } else {
      vscode.window.showInformationMessage(`Logout failed ${error?.message}}`)
    }
  }
}
