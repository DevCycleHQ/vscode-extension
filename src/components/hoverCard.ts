import * as vscode from 'vscode'
import { CombinedVariableData, getCombinedVariableDetails } from '../cli'

export const getHoverString = async (
  folder: vscode.WorkspaceFolder,
  variableKey: string
) => {
  const variableData = await getCombinedVariableDetails(folder, variableKey)

  const hoverString = new vscode.MarkdownString('')
  hoverString.isTrusted = true
  hoverString.supportHtml = true

  if (variableData) {
    hoverString.appendMarkdown(getHTML(variableData))
  }
  return hoverString
}

const getHTML = (
  variableData: CombinedVariableData
) => {
  const { variable, feature } = variableData

  const possibleValuesCommand = ''
  const usagesCommand = 'command:devcycle-feature-flags.openUsagesView'
  const detailsCommand = ''

  const possibleValuesLink = generateLinkToSidebar('codicon-preserve-case', 'Possible Values', possibleValuesCommand)
  const usagesLink = generateLinkToSidebar('codicon-symbol-keyword', 'Usages', usagesCommand, { variableKey: variable.key })
  const detailsLink = generateLinkToSidebar('codicon-search', 'Details', detailsCommand)

  return `
<b>DevCycle Variable:</b> ${variable.name} \n
${feature && `From feature: ${feature.name}`} \n 
--------
${possibleValuesLink}${usagesLink}${detailsLink}
    `
}

const generateLinkToSidebar = (iconClass: string, label: string, command: string, param?: unknown) => {
  const encodedParamString = param ? encodeURIComponent(JSON.stringify(param)) : ''
  const composedCommand = encodedParamString ? `${command}?${encodedParamString}` : command

  return command ? `<span class="codicon ${iconClass}"></span>&nbsp;[${label}](${composedCommand})&emsp;` : ''
}
