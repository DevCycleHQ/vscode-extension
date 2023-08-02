import * as fs from 'fs'
import * as jsYaml from 'js-yaml'
import * as os from 'os'
import * as vscode from 'vscode'
import { status } from '../cli'
import { KEYS, StateManager } from '../StateManager'

type User = {
  project: string
}

type Config = {
  project?: string
}
export function loadConfig() {
  const repoConfigPath = './.devcycle/config.yml'
  const globalUserPath = `${os.homedir()}/.config/devcycle/user.yml`

  let config: Config = {}

  if (fs.existsSync(repoConfigPath)) {
    const repoUserFile = fs.readFileSync(repoConfigPath, 'utf8')
    const user = jsYaml.load(repoUserFile) as User
    if (user.project) {
      config.project = user.project
    }
  } else if (fs.existsSync(globalUserPath)) {
    const globalUserFile = fs.readFileSync(globalUserPath, 'utf8')
    const user = jsYaml.load(globalUserFile) as User
    if (user.project) {
      config.project = user.project
    }
  }

  return config
}

export async function autoLoginIfHaveCredentials() {
  const { project: configProject } = loadConfig()
  const projectId = configProject || await StateManager.getState(KEYS.PROJECT_ID)

  const { hasAccessToken, organization } = await status()
  const hasAllCredentials = Boolean(hasAccessToken && organization && projectId)

  await vscode.commands.executeCommand(
    'setContext',
    'devcycle-feature-flags.hasCredentialsAndProject',
    hasAllCredentials,
  )

  return hasAllCredentials
}
