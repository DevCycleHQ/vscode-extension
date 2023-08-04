import * as vscode from 'vscode'
import { KEYS, StateManager } from '../StateManager'
import { execDvc } from './baseCLIController'
import { loadRepoConfig } from '../utils'

export type Project = {
  _id: string
  name: string
  key: string
}

export async function getAllProjects() {
  const projects = StateManager.getState(KEYS.PROJECTS)
  if (projects) {
    return projects
  }
  const { code, error, output } = await execDvc('projects get')
  if (code !== 0) {
    vscode.window.showErrorMessage(
      `Retrieving projects failed: ${error?.message}}`,
    )
    return []
  } else {
    const projects = JSON.parse(output) as Project[]
    const projectsMap = projects.reduce((result, currentProject) => {
      result[currentProject.key] = currentProject
      return result
    }, {} as Record<string, Project>)

    StateManager.setState(KEYS.PROJECTS, projectsMap)
    return projectsMap
  }
}

export async function selectProjectFromConfig() {
  const { project: projFromConfig } = StateManager.getState(KEYS.REPO_CONFIG) || {}

  if (projFromConfig) {
    await selectProject(projFromConfig)
  }

  return projFromConfig
}

export async function selectProjectFromList(projects: string[]) {
  const project = projects.length === 1
    ? projects[0]
    : await vscode.window.showQuickPick(projects, {
      ignoreFocusOut: true,
      title: 'Select DevCycle Project',
    })
  
  if (!project) {
    throw new Error('No project selected')
  }

  await selectProject(project)
}

async function selectProject(project: string) {
  const { code, error } = await execDvc(`projects select --project=${project}`)
  if (code === 0) {
    await vscode.commands.executeCommand(
      'setContext',
      'devcycle-feature-flags.repoConfigured',
      true,
    )
    StateManager.setState(KEYS.PROJECT_ID, project)
  } else {
    vscode.window.showErrorMessage(`Selecting project failed ${error?.message}}`)
    throw error
  }
}
