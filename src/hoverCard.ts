import * as vscode from 'vscode'
import { CombinedVariableData, getCombinedVariableDetails } from './cli'

export const getHoverString = async (
  variableKey: string,
  extensionUri: string,
) => {
  const variableData = await getCombinedVariableDetails(variableKey)

  const hoverString = new vscode.MarkdownString('')
  hoverString.isTrusted = true
  hoverString.supportHtml = true

  if (variableData) {
    hoverString.appendMarkdown(getHTML(variableData, extensionUri))
  }
  return hoverString
}

const getHTML = (variableData: CombinedVariableData, extensionUri: string) => {
  const toggleOnIcon = `<img src="${extensionUri}/icons/toggleon.svg" alt="toggle">`
  const toggleOffIcon = `<img src="${extensionUri}/icons/toggleoff.svg" alt="toggle">`

  const { variable, feature, configurations } = variableData

  const configs =
    configurations?.map((config) => {
      return `${config.envName}: ${
        config.status === 'active' ? toggleOnIcon : toggleOffIcon
      }`
    }) || []

  return `
Name: ${variable.name} \n
Key: ${variable.key}\n
${variable.description ? `Description: ${variable.description}` : ''} \n
Status: ${variable.status} \n
${feature ? `Feature: ${feature.name}` : `Unassociated`} \n 
--------
${configs.join('<br/>')}
    `
}
