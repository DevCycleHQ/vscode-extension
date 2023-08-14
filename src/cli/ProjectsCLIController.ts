import * as vscode from 'vscode'
import { KEYS, StateManager } from '../StateManager'
import { BaseCLIController } from './BaseCLIController'
import { getRepoConfig } from '../utils'

export type Project = {
  _id: string
  name: string
  key: string
}

export class ProjectsCLIController extends BaseCLIController {
  public async getAllProjects() {
    const projects = StateManager.getFolderState(this.folder.name, KEYS.PROJECTS)
    if (projects) {
      return projects
    }
    const { code, error, output } = await this.execDvc('projects get')
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
  
      StateManager.setFolderState(this.folder.name, KEYS.PROJECTS, projectsMap)
      return projectsMap
    }
  }
  
  public async selectProjectFromConfig() {
    const { project: projFromConfig } = await getRepoConfig(this.folder)
  
    if (projFromConfig) {
      await this.selectProject(projFromConfig)
    }
  
    return projFromConfig
  }
  
  public async selectProjectFromList(projects: string[]) {
    const project = projects.length === 1
      ? projects[0]
      : await vscode.window.showQuickPick(projects, {
        ignoreFocusOut: true,
        title: 'Select DevCycle Project',
      })
    
    if (!project) {
      throw new Error('No project selected')
    }
  
    await this.selectProject(project)
    return project
  }
  
  protected async selectProject(project: string) {
    const { code, error } = await this.execDvc(`projects select --project=${project}`)
    if (code === 0) {
      StateManager.setFolderState(this.folder.name, KEYS.PROJECT_ID, project)
    } else {
      vscode.window.showErrorMessage(`Selecting project failed ${error?.message}}`)
      throw error
    }
  }
}
