import * as vscode from 'vscode'
import * as cp from 'child_process'
import { StateManager, KEYS } from '../StateManager'
import { showBusyMessage, hideBusyMessage } from '../components/statusBarItem'
import { Organization, selectOrganizationFromConfig, selectOrganizationFromList } from './organizationsCLIController'
import { loadRepoConfig } from '../utils'

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
  organization?: string
  a0UserId: string
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


export async function init() {
  showBusyMessage('Initializing DevCycle')
  const { code, error, output } = await execDvc('repo init')
  if (code === 0) {
    await vscode.commands.executeCommand(
      'setContext',
      'devcycle-feature-flags.loggedIn',
      true,
    )
  } else {
    vscode.window.showErrorMessage(`Login failed ${error?.message}}`)
  }
  hideBusyMessage()
  const organizations = JSON.parse(output) as Organization[]
  await selectOrganizationFromList(organizations)
  await vscode.commands.executeCommand('devcycle-feature-flags.refresh-usages')
  vscode.window.showInformationMessage('DevCycle Configured')
}

export async function login() {
  showBusyMessage('Logging into DevCycle')

  try {
    await loadRepoConfig()
    StateManager.setState(KEYS.ORGANIZATION, undefined)
    StateManager.setState(KEYS.PROJECT_ID, undefined)

    const orgFromConfig = await selectOrganizationFromConfig()

    if (!orgFromConfig) {
      const { output: orgResponse } = await execDvc('organizations get')
      const organizations = JSON.parse(orgResponse) as Organization[]

      await selectOrganizationFromList(organizations)
    }

    const cliStatus = await status()
    const auth0UserId = cliStatus.a0UserId
    StateManager.setState(KEYS.AUTH0_USER_ID, auth0UserId)

    await vscode.commands.executeCommand(
      'setContext',
      'devcycle-feature-flags.loggedIn',
      true,
    )
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

export async function status(): Promise<DevCycleStatus> {
  const { output } = await execDvc('status')
  return JSON.parse(output) as DevCycleStatus
}

export async function usages(): Promise<JSONMatch[]> {
  showBusyMessage('Finding Devcycle code usages')
  const { output } = await execDvc('usages --format=json')
  
  const matches = JSON.parse(output) as JSONMatch[]
  hideBusyMessage()
  StateManager.setState(KEYS.CODE_USAGE_KEYS, matches.map((match) => match.key))
  return matches
}

export async function logout() {
  const { code, error } = await execDvc('logout')
  if (code === 0) {
    await vscode.commands.executeCommand(
      'setContext',
      'devcycle-feature-flags.loggedIn',
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
    vscode.workspace.getConfiguration('devcycle-feature-flags').get('cli') ||
    'dvc'
  const project_id = StateManager.getState(KEYS.PROJECT_ID)
  let shellCommand = `${cli} ${cmd} --headless --caller vscode_extension`
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
    .getConfiguration('devcycle-feature-flags')
    .get('debug')
  if (debug) {
    vscode.window.showInformationMessage(message)
  }
}
