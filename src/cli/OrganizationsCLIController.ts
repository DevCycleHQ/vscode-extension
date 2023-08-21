import * as vscode from 'vscode'
import { BaseCLIController } from './BaseCLIController'
import { ProjectsCLIController } from './ProjectsCLIController'
import { KEYS, StateManager } from '../StateManager'
import { hideBusyMessage, showBusyMessage } from '../components/statusBarItem'
import { getRepoConfig } from '../utils'

export type Organization = {
  id: string
  name: string
  display_name: string
}

export class OrganizationsCLIController extends BaseCLIController {
  projectController: ProjectsCLIController
  baseCLIController: BaseCLIController

  constructor(folder: vscode.WorkspaceFolder) {
    super(folder)
    this.projectController = new ProjectsCLIController(folder)
    this.baseCLIController = new BaseCLIController(folder)
  }

  public async getActiveOrganization() {
    const stateOrg = StateManager.getFolderState(this.folder.name, KEYS.ORGANIZATION)
    if (stateOrg) {
      return stateOrg
    }
    const orgName = (await this.baseCLIController.status()).organization
    const orgObject = (await this.getAllOrganizations()).find((o) => o.name === orgName)

    StateManager.setFolderState(this.folder.name, KEYS.ORGANIZATION, orgObject)
    return orgObject
  }

  public async getAllOrganizations() {
    const { code, error, output } = await this.execDvc('organizations get')

    if (code === 0) {
      const organizations = JSON.parse(output) as Organization[]
      return organizations  
    } else {
      vscode.window.showErrorMessage(
        `Retrieving organizations failed: ${error?.message}}`,
      )
      return []
    }
  }

  public async selectOrganizationFromConfig() {
    const { org: orgFromConfig } = await getRepoConfig(this.folder)

    if (orgFromConfig) {
      await this.execDvc('login again')
      StateManager.setFolderState(this.folder.name, KEYS.ORGANIZATION, orgFromConfig)

      const projectFromConfig = await this.projectController.selectProjectFromConfig()
      if (!projectFromConfig) {
        const projectMap = await this.projectController.getAllProjects() || {}
        const projectKeys = Object.keys(projectMap)
        await this.projectController.selectProjectFromList(projectKeys)
      }
    }

    return orgFromConfig
  }

  public async selectOrganizationFromList(organizations: Organization[]) {
    const quickPickItems = organizations.map((org) => ({
      label: org.display_name,
      value: org
    }))
    const selectedItem = quickPickItems.length === 1
      ? quickPickItems[0]
      : await vscode.window.showQuickPick(quickPickItems, {
        ignoreFocusOut: true,
        title: `Select DevCycle Organization (${this.folder.name})`,
      })
    const selectedOrg = selectedItem?.value

    if (!selectedOrg) {
      throw new Error('No organization selected')
    }

    showBusyMessage('Logging into DevCycle organization')

    await this.selectOrganization(selectedOrg).finally(hideBusyMessage)
    return selectedOrg
  }

  public async selectOrganization(org: Organization | string, selectProjectFromList?: boolean) {
    const orgName = typeof org === 'string' ? org : org?.name
    const { code, error, output } = await this.execDvc(`organizations select --org=${orgName}`)
  
    if (code !== 0) {
      vscode.window.showErrorMessage(
        `Organization login failed ${error?.message}}`,
      )
      throw error
    }

    if (typeof org === 'string') {
      const orgObject = (await this.getAllOrganizations()).find((o) => o.name === org)
      StateManager.setFolderState(this.folder.name, KEYS.ORGANIZATION, orgObject)
    } else {
      StateManager.setFolderState(this.folder.name, KEYS.ORGANIZATION, org)
    }

    const projectFromConfig = await this.projectController.selectProjectFromConfig()
    if (!projectFromConfig && selectProjectFromList) {
      const projects = JSON.parse(output)
      await this.projectController.selectProjectFromList(projects)
    }
  }
}
