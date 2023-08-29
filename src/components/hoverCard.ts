import * as vscode from 'vscode'
import { CombinedVariableData, getCombinedVariableDetails } from '../cli'
import { KEYS, StateManager } from '../StateManager'

const possibleValuesCommand = ''
const usagesCommand = 'command:devcycle-feature-flags.openUsagesView'
const detailsCommand = ''

export const getHoverString = async (
  folder: vscode.WorkspaceFolder,
  variableKey: string,
) => {
  const apiVariables = StateManager.getFolderState(folder.name, KEYS.VARIABLES) || {}
  const variableData = apiVariables[variableKey]
    ? await getCombinedVariableDetails(folder, variableKey)
    : undefined

  const hoverString = new vscode.MarkdownString('')
  hoverString.isTrusted = true
  hoverString.supportHtml = true

  hoverString.appendMarkdown(
    variableData ? getVariableHTML(variableData) : getVariableNotFoundHTML(variableKey)
  )
  return hoverString
}

const getVariableHTML = (
  variableData: CombinedVariableData
) => {
  const { variable, feature } = variableData

  const possibleValuesLink = generateLinkToSidebar('codicon-preserve-case', 'Possible Values', possibleValuesCommand)
  const usagesLink = generateLinkToSidebar('codicon-symbol-keyword', 'Usages', usagesCommand, { variableKey: variable.key })
  const detailsLink = generateLinkToSidebar('codicon-search', 'Details', detailsCommand)

  return `
  <b>DevCycle Variable:</b> ${variable.name} \n
  ${feature && `Feature: ${feature.name}`} \n 
  --------
  ${possibleValuesLink}${usagesLink}${detailsLink}
`
}

const getVariableNotFoundHTML = (variableKey: string) => {
  const usagesLink = generateLinkToSidebar('codicon-symbol-keyword', 'Usages', usagesCommand, { variableKey })

  return `
  <b>Variable:</b> ${variableKey} (not found in DevCycle)\n
  --------
  ${usagesLink}
`
}

const generateLinkToSidebar = (iconClass: string, label: string, command: string, param?: unknown) => {
  const encodedParamString = param ? encodeURIComponent(JSON.stringify(param)) : ''
  const composedCommand = encodedParamString ? `${command}?${encodedParamString}` : command

  return command ? `<span class="codicon ${iconClass}"></span>&nbsp;[${label}](${composedCommand})&emsp;` : ''
}
