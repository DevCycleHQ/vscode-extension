import * as vscode from 'vscode'
import * as cp from 'child_process'
import { getCredentials } from '../utils/credentials'
import { StateManager, KEYS } from '../StateManager'
import { showBusyMessage, hideBusyMessage } from '../components/statusBarItem'
type CommandResponse = {
  output: string
  error: Error | null
  code: number
}

type DevCycleStatus = {
  version: string
  repoConfigPath: string
  repoConfigExists: 'true' | 'false'
  userConfigPath: string
  userConfigExists: 'true' | 'false'
  authConfigPath: string
  hasAccessToken: 'true' | 'false'
  organization?: {
    id: string
    name: string
    display_name: string
  }
}

export type JSONMatch = {
  key: string
  references: VariableReference[]
}

export type VariableReference = {
  codeSnippet: CodeSnippet
  lineNumbers: Range
  fileName: string
  language: string
}

export type CodeSnippet = {
  lineNumbers: Range
  content: string
}

export type Range = {
  start: number
  end: number
}

const CACHE_TIME = 15000



export async function init() {
  showBusyMessage('Initializing DevCycle')
  const { code, error, output } = await execDvc('repo init')
  if (code === 0) {
    await vscode.commands.executeCommand(
      'setContext',
      'devcycle-featureflags.loggedIn',
      true,
    )
  } else {
    vscode.window.showErrorMessage(`Login failed ${error?.message}}`)
  }
  hideBusyMessage()
  const organizations = JSON.parse(output) as string[]
  await chooseOrganization(organizations)
  await vscode.commands.executeCommand('devcycle-featureflags.refresh-usages')
  vscode.window.showInformationMessage('DevCycle Configured')
}

export async function login() {
  showBusyMessage('Logging into DevCycle')

  try {
    const { output: orgResponse } = await execDvc('organizations list')
    const organizations = JSON.parse(orgResponse) as string[]

    await chooseOrganization(organizations)

    await vscode.commands.executeCommand(
      'setContext',
      'devcycle-featureflags.loggedIn',
      true,
    )
    vscode.window.showInformationMessage('Logged in to DevCycle')
  } catch (e) {
    if (e instanceof Error) {
      vscode.window.showErrorMessage(`Login failed ${e.message}}`)
    }
  }
  hideBusyMessage()
}

export async function chooseOrganization(organizations: string[]) {
  const organization = organizations.length === 1
    ? organizations[0]
    : await vscode.window.showQuickPick(organizations, {
      ignoreFocusOut: true,
      title: 'Select DevCycle Organization',
    })
  StateManager.setState(KEYS.ORGANIZATION_ID, organization)
  StateManager.setState(KEYS.PROJECT_ID, undefined)

  showBusyMessage('Logging into DevCycle organization')
  const { code, error, output } = await execDvc(`organizations select --org=${organization}`)
  hideBusyMessage()

  if (code !== 0) {
    vscode.window.showErrorMessage(
      `Organization login failed ${error?.message}}`,
    )
    throw error
  }

  const projects = JSON.parse(output) as string[]
  await chooseProject(projects)
}

export async function chooseProject(projects: string[]) {
  const project = projects.length === 1
    ? projects[0]
    : await vscode.window.showQuickPick(projects, {
      ignoreFocusOut: true,
      title: 'Select DevCycle Project',
    })
  const { code, error } = await execDvc(`projects select --project=${project}`)
  if (code === 0) {
    await vscode.commands.executeCommand(
      'setContext',
      'devcycle-featureflags.repoConfigured',
      true,
    )
  } else {
    vscode.window.showErrorMessage(`Selecting project failed ${error?.message}}`)
    throw error
  }
}

export async function status(): Promise<DevCycleStatus> {
  const { output } = await execDvc('status')
  return JSON.parse(output) as DevCycleStatus
}

export async function usages(): Promise<JSONMatch[]> {
  showBusyMessage('Finding Devcycle code usages')
  const { output } = await execDvc('usages --format=json')
  const matches = JSON.parse(output) as JSONMatch[]
  hideBusyMessage()
  return matches
}

export async function logout() {
  const { code, error } = await execDvc('logout')
  if (code === 0) {
    await vscode.commands.executeCommand(
      'setContext',
      'devcycle-featureflags.loggedIn',
      false,
    )
    vscode.window.showInformationMessage('Logged out of DevCycle')
  } else {
    vscode.window.showInformationMessage(`Logout failed ${error?.message}}`)
  }
}

export async function addAlias(alias: string, variableKey: string) {
  const { code, error } = await execDvc(
    `alias add --alias=${alias} --variable=${variableKey}`,
  )
  if (code !== 0) {
    vscode.window.showErrorMessage(`Adding alias failed: ${error?.message}}`)
  }
}

export async function execDvc(cmd: string) {
  const cli =
    vscode.workspace.getConfiguration('devcycle-featureflags').get('cli') ||
    'dvc'
  const project_id = StateManager.getState(KEYS.PROJECT_ID)
  let shellCommand = `${cli} ${cmd} --headless`
  if (project_id) shellCommand += ` --project ${project_id}`
  return execShell(shellCommand)
}

function execShell(cmd: string) {
  showDebugOutput(`Executing shell command ${cmd}`)
  return new Promise<CommandResponse>((resolve, reject) => {
    const workspace = getWorkspace()
    if (!workspace) {
      vscode.window.showErrorMessage(
        'DevCycle extension requires an open workspace',
      )
      return
    }
    const cpOptions: cp.ExecOptions = {
      cwd: workspace.uri.fsPath,
    }
    cp.exec(cmd, cpOptions, (err, out) => {
      if (err) {
        resolve({
          output: out,
          error: err,
          code: err.code || 0,
        })
      }
      resolve({
        output: out,
        error: null,
        code: 0,
      })
      return
    })
  })
}

function getWorkspace() {
  const workspaces = vscode.workspace.workspaceFolders
  if (!workspaces) {
    return undefined
  }
  const activeDocument = vscode.window.activeTextEditor?.document
  return activeDocument
    ? vscode.workspace.getWorkspaceFolder(activeDocument.uri)
    : workspaces[0]
}

function showDebugOutput(message: string) {
  const debug = vscode.workspace
    .getConfiguration('devcycle-featureflags')
    .get('debug')
  if (debug) {
    vscode.window.showInformationMessage(message)
  }
}
