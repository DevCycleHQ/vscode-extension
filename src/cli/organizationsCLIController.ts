import * as vscode from 'vscode'
import { execDvc } from './baseCLIController'
import { getAllProjects, selectProjectFromConfig, selectProjectFromList } from './projectsCLIController'
import { KEYS, StateManager } from '../StateManager'
import { hideBusyMessage, showBusyMessage } from '../components/statusBarItem'
import { getRepoConfig } from '../utils'

export type Organization = {
  id: string
  name: string
  display_name: string
}

export async function selectOrganizationFromConfig() {
  const { org: orgFromConfig } = await getRepoConfig()

  if (orgFromConfig) {
    await execDvc('login again')
    StateManager.setState(KEYS.ORGANIZATION, orgFromConfig)

    const projectFromConfig = await selectProjectFromConfig()
    if (!projectFromConfig) {
      const projectKeys = Object.keys(await getAllProjects() || {})
      await selectProjectFromList(projectKeys)
    }
  }

  return orgFromConfig
}

export async function selectOrganizationFromList(organizations: Organization[]) {
  const quickPickItems = organizations.map((org) => ({
    label: org.display_name,
    value: org
  }))
  const selectedItem = quickPickItems.length === 1
    ? quickPickItems[0]
    : await vscode.window.showQuickPick(quickPickItems, {
      ignoreFocusOut: true,
      title: 'Select DevCycle Organization',
    })
  const selectedOrg = selectedItem?.value
  
  if (!selectedOrg) {
    throw new Error('No organization selected')
  }

  showBusyMessage('Logging into DevCycle organization')

  await selectOrganization(selectedOrg).finally(hideBusyMessage)
  return selectedOrg
}

async function selectOrganization(org: Organization) {
  const { code, error, output } = await execDvc(`organizations select --org=${org?.name}`)

  if (code !== 0) {
    vscode.window.showErrorMessage(
      `Organization login failed ${error?.message}}`,
    )
    throw error
  }

  StateManager.setState(KEYS.ORGANIZATION, org)

  const projectFromConfig = await selectProjectFromConfig()
  if (!projectFromConfig) {
    const projects = JSON.parse(output)
    await selectProjectFromList(projects)
  }
}