import * as vscode from 'vscode'
import * as cp from 'child_process'
import { SecretStateManager, CLIENT_KEYS } from './SecretStateManager'
import { KEYS, StateManager } from './StateManager'

type CommandResponse = {
  output: string,
  error: Error | null,
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
    id: string,
    name: string,
    display_name: string
  }
}

export type JSONMatch = {
  key: string,
  references: VariableReference[]
}

export type VariableReference = {  
  codeSnippet: CodeSnippet,
  lineNumbers: Range
  fileName: string
  language: string
}

export type CodeSnippet = {
  lineNumbers: Range,
  content: string
}

export type Range = {
  start: number
  end: number
}

export type Environment = {
  name: string;
  _id: string;
}

export type Variable = {
  key: string;
  _feature: string;
  name: string;
  description?: string;
  status: 'active' | 'archived';
}

export type Feature = {
  key: string;
  _id: string;
  name: string;
}

export type FeatureConfiguration = {
  key: string;
  _id: string;
  status: string;
  _environment: string;
}

export type FeatureConfigurationsByFeatureId = Record<string, FeatureConfiguration[]>

const STATUS_BAR_ITEM:string = 'devcycle-featureflags'
const CACHE_TIME = 15000

export default class DevcycleCLIController {
  private statusBarItem:vscode.StatusBarItem
  public repoConfigured:boolean = false
  public loggedIn:boolean = false

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(STATUS_BAR_ITEM)
    this.statusBarItem.name = "DevCycle Status"
  }

  public async init() {
    this.showBusyMessage('Initializing DevCycle')
    const { code, error, output } = await this.execDvc('repo init')
    if (code === 0) {
      this.loggedIn = true
      await vscode.commands.executeCommand('setContext', 'devcycle-featureflags.loggedIn', true)
    } else {
      vscode.window.showErrorMessage(`Login failed ${error?.message}}`)
    }
    this.hideStatus()
    const organizations = JSON.parse(output) as string[]
    await this.chooseOrganization(organizations)
    if(this.repoConfigured) {
      await vscode.commands.executeCommand('devcycle-featureflags.refresh-usages')
      vscode.window.showInformationMessage('DevCycle Configured')
    }
  }

  public async login() {
    this.showBusyMessage('Logging into DevCycle')
    const { code, error } = await this.execDvc('login again')
    if (code === 0) {
      this.loggedIn = true
      await vscode.commands.executeCommand('setContext', 'devcycle-featureflags.loggedIn', true)
      vscode.window.showInformationMessage('Logged in to DevCycle')
    } else {
      vscode.window.showErrorMessage(`Login failed ${error?.message}}`)
    }
    this.hideStatus()
  }

  public async chooseOrganization(organizations:string[]) {
    const organization = await vscode.window.showQuickPick(organizations, {
      ignoreFocusOut: true,
      title: 'Select DevCycle Organization'
    })
    this.showBusyMessage('Logging into DevCycle organization')
    const { code, error, output } = await this.execDvc(`org --org=${organization}`)
    if (code !== 0) {
      vscode.window.showErrorMessage(`Organization login failed ${error?.message}}`)
    }
    this.hideStatus()
    const projects = JSON.parse(output) as string[]
    return this.chooseProject(projects)
  }

  public async chooseProject(projects:string[]) {
    const project = await vscode.window.showQuickPick(projects, {
      ignoreFocusOut: true,
      title: 'Select DevCycle Project'
    })
    const { code, error } = await this.execDvc(`projects select --project=${project}`)
    if (code === 0) {
      this.repoConfigured = true
      await vscode.commands.executeCommand('setContext', 'devcycle-featureflags.repoConfigured', true)
    } else {
      vscode.window.showErrorMessage(`Choosing project failed ${error?.message}}`)
    }
  }

  public async status(): Promise<DevCycleStatus> {
    const { output } = await this.execDvc('status')
    return JSON.parse(output) as DevCycleStatus
  }

  public async usages(): Promise<JSONMatch[]> {
    this.showBusyMessage('Finding Devcycle code usages')
    const { output } = await this.execDvc('usages --format=json')
    const matches = JSON.parse(output) as JSONMatch[]
    this.hideStatus()
    return matches
  }

  public async logout() {
    const { code, error } = await this.execDvc('logout')
    if (code === 0) {
      this.loggedIn = false
      await vscode.commands.executeCommand('setContext', 'devcycle-featureflags.loggedIn', false)
      vscode.window.showInformationMessage('Logged out of DevCycle')
    } else {
      vscode.window.showInformationMessage(`Logout failed ${error?.message}}`)
    }
  }

  public async getEnvironment(environmentId: string) {
    const environments = (StateManager.getState(KEYS.ENVIRONMENTS) || {}) as Record<string, Environment>
    const environment = environments[environmentId]
    if (environment) {
      return environment
    }

    const { code, error, output } = await this.execDvc(`environments get --keys='${environmentId}'`)
    if (code !== 0) {
      vscode.window.showErrorMessage(`Retrieving environment ${environmentId} failed: ${error?.message}}`)
      return
    } else {
      // add the missing variable to the state
      const environmentsResult = JSON.parse(output)
      if (!environmentsResult || !environmentsResult.length) {
        return
      }
      const environment = environmentsResult[0]

      environments[environmentId] = environment
      StateManager.setState(KEYS.ENVIRONMENTS, environments)
      return environment
    }
  }

  public async getAllEnvironments() {
    const environments = StateManager.getState(KEYS.ENVIRONMENTS) as Record<string, Environment>
    if (environments) {
      return environments
    }
    const { code, error, output } = await this.execDvc('environments get')
    if (code !== 0) {
      vscode.window.showErrorMessage(`Retrieving environments failed: ${error?.message}}`)
      return []
    } else {
      const environments = JSON.parse(output) as Environment[]
      const environmentMap = environments.reduce((result, currentEnvironment) => {
        result[currentEnvironment._id] = currentEnvironment
        return result
      }, {} as Record<string, Environment>);

      StateManager.setState(KEYS.ENVIRONMENTS, environmentMap)
      return environmentMap
    }
  }


  public async getVariable(variableKey: string) {
    const variables = StateManager.getState(KEYS.VARIABLES) as Record<string, Variable> || {}
    const variable = variables[variableKey]
    if (variable) {
      return variable
    }

    const { code, error, output } = await this.execDvc(`variables get --keys='${variableKey}'`)
    if (code !== 0) {
      vscode.window.showErrorMessage(`Retrieving feature ${variableKey} failed: ${error?.message}}`)
      return
    } else {
      // add the missing variable to the state
      const variablesResult = JSON.parse(output)
      if (!variablesResult || !variablesResult.length) {
        return
      }
      const variable = variablesResult[0]
      variables[variableKey] = variable
      StateManager.setState(KEYS.VARIABLES, variables)
      return variable
    }
  }

  public async getAllVariables() {
    const variables = StateManager.getState(KEYS.VARIABLES) as Record<string, Variable>
    if (variables) {
      return variables
    }
    const { code, error, output } = await this.execDvc('variables get')
    if (code !== 0) {
      vscode.window.showErrorMessage(`Retrieving variables failed: ${error?.message}}`)
      return []
    } else {
      const variables = JSON.parse(output) as Variable[]
      const variableMap = variables.reduce((result, currentVariable) => {
        result[currentVariable.key] = currentVariable
        return result
      }, {} as Record<string, Variable>);

      StateManager.setState(KEYS.VARIABLES, variableMap)
      return variableMap
    }
  }


  public async getFeature(featureId: string) {
    const features = StateManager.getState(KEYS.FEATURES) as Record<string, Feature> || {}
    const feature = features[featureId]
    if (feature) {
      return feature
    }
    const { code, error, output } = await this.execDvc(`features get --keys='${featureId}'`)
    if (code !== 0) {
      vscode.window.showErrorMessage(`Retrieving feature ${featureId} failed: ${error?.message}}`)
      return
    } else {
      // add the missing feature to the state
      const featuresResult = JSON.parse(output)
      if (!featuresResult || !featuresResult.length) {
        return
      }
      const feature = featuresResult[0]
      features[featureId] = feature
      StateManager.setState(KEYS.FEATURES, features)
      return feature
    }
  }

  public async getAllFeatures() {
    const features = StateManager.getState(KEYS.FEATURES) as Record<string, Feature>
    if (features) {
      return features
    }
    const { code, error, output } = await this.execDvc('features get')
    if (code !== 0) {
      vscode.window.showErrorMessage(`Retrieving features failed: ${error?.message}}`)
      return []
    } else {
      const features = JSON.parse(output) as Feature[]
      const featureMap = features.reduce((result, currentFeature) => {
        result[currentFeature._id] = currentFeature
        return result
      }, {} as Record<string, Feature>);

      StateManager.setState(KEYS.FEATURES, featureMap)
      return featureMap
    }
  }


  public async getFeatureConfigurations(featureId: string) {
    const featureConfigsMap = StateManager.getState(KEYS.FEATURE_CONFIGURATIONS) as FeatureConfigurationsByFeatureId || {}
    const featureConfigs = featureConfigsMap[featureId]
    if (featureConfigs) {
      return featureConfigs
    }

    const { code, error, output } = await this.execDvc(`targeting get ${featureId}`)
    if (code !== 0) {
      vscode.window.showErrorMessage(`Retrieving feature configurations for ${featureId} failed: ${error?.message}}`)
      return []
    } else {
      // add the missing feature configs to the state
      const featureConfigs = JSON.parse(output)
      featureConfigsMap[featureId] = featureConfigs
      StateManager.setState(KEYS.FEATURE_CONFIGURATIONS, featureConfigsMap)
      return featureConfigs
    }
  }

  public async addAlias(alias:string, variableKey:string) {
    const { code, error } = await this.execDvc(`alias add --alias=${alias} --variable=${variableKey}`)
    if (code !== 0) {
      vscode.window.showErrorMessage(`Adding alias failed: ${error?.message}}`)
    }
  }

  private showBusyMessage(message:string) {
    this.statusBarItem.text = `$(loading~spin) ${message}...`
    this.statusBarItem.tooltip = `${message}...`
    this.statusBarItem.show()
  }

  private hideStatus() {
    this.statusBarItem.hide()
  }

  private async execDvc(cmd: string) {
    const cli = vscode.workspace.getConfiguration('devcycle-featureflags').get('cli') || 'dvc'
    const secrets = SecretStateManager.instance
    const client_id = await secrets.getSecret(CLIENT_KEYS.CLIENT_ID)
    const client_secret = await secrets.getSecret(CLIENT_KEYS.CLIENT_SECRET)

    const shellCommand = `${cli} ${cmd} --headless --client-id ${client_id} --client-secret ${client_secret}`
    return this.execShell(shellCommand)
  }

  private execShell(cmd: string) {
    this.showDebugOutput(`Executing shell command ${cmd}`)
    return new Promise<CommandResponse>((resolve, reject) => {
      const workspace = this.getWorkspace()
      if (!workspace) {
        vscode.window.showErrorMessage('DevCycle extension requires an open workspace')
        return
      }
      const cpOptions:cp.ExecOptions = {
        cwd: workspace.uri.fsPath,
      }
      cp.exec(cmd, cpOptions, (err, out) => {
        if (err) {
          resolve({
            output: out,
            error: err,
            code: err.code || 0
          })
        }
        resolve({
          output: out,
          error: null,
          code: 0
        })
        return
      })
    })
  }

  private getWorkspace() {
    const workspaces = vscode.workspace.workspaceFolders
    if (!workspaces) {
      return undefined
    }
    const activeDocument = vscode.window.activeTextEditor?.document
    return activeDocument
      ? vscode.workspace.getWorkspaceFolder(activeDocument.uri)
      : workspaces[0]
  }

  private showDebugOutput(message:string) {
    const debug = vscode.workspace.getConfiguration('devcycle-featureflags').get('debug')
    if(debug) {
      vscode.window.showInformationMessage(message)
    }
  }

  private isRecent(date:Date) {
    const diff = Date.now() - date.getTime()
    return (diff < CACHE_TIME)
  }

}