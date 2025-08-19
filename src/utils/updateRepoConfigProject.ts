import * as vscode from 'vscode'
import yaml from 'js-yaml'
import fs from 'fs'
import { BaseCLIController } from '../cli'
import { RepoConfig } from './loadRepoConfig'

export const updateRepoConfig = async (
  folder: vscode.WorkspaceFolder,
  changes: Partial<RepoConfig>
): Promise<void> => {
  const rootPath = folder.uri.fsPath
  try {
    const cli = new BaseCLIController(folder)
    const { repoConfigPath } = await cli.status()
    const configFileByteArray = await vscode.workspace.fs.readFile(
      vscode.Uri.parse(`file:${rootPath}/${repoConfigPath}`)
    )
    const configFileString = new TextDecoder().decode(configFileByteArray)
    const configFileJson = yaml.load(configFileString, { schema: yaml.CORE_SCHEMA }) as RepoConfig

    const updatedConfig = {
        ...configFileJson,
        ...changes
    }
    fs.writeFileSync(`${rootPath}/${repoConfigPath}`, yaml.dump(updatedConfig))
  } catch (e) {}
}
