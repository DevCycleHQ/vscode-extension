import * as vscode from 'vscode'
import { BaseCLIController } from './BaseCLIController'
import { ProjectsCLIController } from './ProjectsCLIController'
import { KEYS, StateManager } from '../StateManager'
import { hideBusyMessage, showBusyMessage } from '../components/statusBarItem'
import utils from '../utils'

export type Organization = {
  id: string
  name: string
  display_name: string
}

export class OrganizationsCLIController extends BaseCLIController {
  projectController: ProjectsCLIController

  constructor(folder: vscode.WorkspaceFolder) {
    super(folder)
    this.projectController = new ProjectsCLIController(folder)
  }

  public async getAllOrganizations() {
    const organizations = StateManager.getWorkspaceState(KEYS.ORGANIZATIONS)
    if (organizations) {
      return organizations
    }
    const { code, error, output } = await this.execDvc('organizations get')

    if (code === 0) {
      const organizations = JSON.parse(output) as Organization[]
      const orgsMap = organizations.reduce((result, currentOrg) => {
        result[currentOrg.id] = currentOrg
        return result
      }, {} as Record<string, Organization>)

      StateManager.setWorkspaceState(KEYS.ORGANIZATIONS, orgsMap)
      return orgsMap
    } else {
      vscode.window.showErrorMessage(
        `Retrieving organizations failed: ${error?.message}}`,
      )
      return {}
    }
  }

  public async selectOrganizationFromConfig() {
    const { org: orgFromConfig } = await utils.getRepoConfig(this.folder)
  
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

    await this.selectOrganization(selectedOrg, true).finally(hideBusyMessage)
    return selectedOrg
  }

  public async selectOrganization(org: Organization | string, selectProject?: boolean) {
    const orgName = typeof org === 'string' ? org : org?.name
    const { code, error, output } = await this.execDvc(`organizations select --org=${orgName}`)

    if (code !== 0) {
      vscode.window.showErrorMessage(
        `Organization login failed ${error?.message}}`,
      )
      throw error
    }

    if (typeof org === 'string') {
      const organizationsMap = await this.getAllOrganizations()
      const orgObject = Object.values(organizationsMap).find((o) => o.name === org)
      StateManager.setFolderState(this.folder.name, KEYS.ORGANIZATION, orgObject)
    } else {
      StateManager.setFolderState(this.folder.name, KEYS.ORGANIZATION, org)
    }

    if (selectProject) {
      const projectFromConfig = await this.projectController.selectProjectFromConfig()
      if (!projectFromConfig) {
        const projects = JSON.parse(output)
        await this.projectController.selectProjectFromList(projects)
      }
    }
  }
}
