import * as fs from 'fs'
import * as jsYaml from 'js-yaml'
import * as os from 'os'
import { CLIENT_KEYS, SecretStateManager } from '../SecretStateManager'
import { KEYS, StateManager } from '../StateManager'
import * as vscode from 'vscode'

type Auth = {
  clientCredentials: {
    client_id: string
    client_secret: string
  }
}

type User = {
  project: string
}

type Config = {
  project?: string
  client_id?: string
  client_secret?: string
}
export function loadConfig() {
  const repoConfigPath = './.devcycle/config.yml'
  const globalAuthPath = `${os.homedir()}/.config/devcycle/auth.yml`
  const globalUserPath = `${os.homedir()}/.config/devcycle/user.yml`

  let config: Config = {}

  if (fs.existsSync(globalAuthPath)) {
    const globalAuthFile = fs.readFileSync(globalAuthPath, 'utf8')
    const auth = jsYaml.load(globalAuthFile) as Auth
    if (auth.clientCredentials) {
      config.client_id = auth.clientCredentials.client_id
      config.client_secret = auth.clientCredentials.client_secret
    }

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
  }

  return config
}

export async function autoLoginIfHaveCredentials() {
  const {
    client_id: config_client,
    client_secret: config_secret,
    project: config_project,
  } = loadConfig()
  const {
    client_id: state_client,
    client_secret: state_secret,
    projectId: state_project,
  } = await getCredentials()
  const client_id = config_client || state_client
  const client_secret = config_secret || state_secret
  const project_id = config_project || state_project

  const hasAllCredentials = client_id && client_secret && project_id
  await vscode.commands.executeCommand(
    'setContext',
    'devcycle-feature-flags.hasCredentialsAndProject',
    hasAllCredentials,
  )

  return hasAllCredentials
}

export async function setClientIdAndSecret(
  client_id: string,
  client_secret: string,
) {
  const secrets = SecretStateManager.instance
  await secrets.setSecret(CLIENT_KEYS.CLIENT_ID, client_id)
  await secrets.setSecret(CLIENT_KEYS.CLIENT_SECRET, client_secret)
}

export async function getCredentials() {
  const secrets = SecretStateManager.instance
  const client_id = await secrets.getSecret(CLIENT_KEYS.CLIENT_ID)
  const client_secret = await secrets.getSecret(CLIENT_KEYS.CLIENT_SECRET)
  const projectId = await StateManager.getState(KEYS.PROJECT_ID)
  return { client_id, client_secret, projectId }
}
