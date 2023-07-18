import { StateManager, KEYS } from "./StateManager";
import * as vscode from "vscode";
import { Variable, getVariable } from "./api/getVariable";
import { Feature, getFeature } from "./api/getFeature";
import { FeatureConfiguration, getFeatureConfigurations } from "./api/getFeatureConfigurations";
import { getEnvironment } from "./api/getEnvironment";

type VariableHoverData = {
  variable: Variable;
  feature?: Feature;
  configurations?: FeatureConfigurationWithEnvironment[]
};

type FeatureConfigurationWithEnvironment = FeatureConfiguration & { environmentName?: string }

const fetchVariableData = async (
  variableKey: string
): Promise<VariableHoverData | undefined> => {
  const variable = await getVariable(variableKey)
  if (!variable) return

  let feature: Feature | undefined;
  let configurations: FeatureConfigurationWithEnvironment[] | undefined
  if (variable?._feature) {
    feature = await getFeature(variable?._feature)
    configurations = await getFeatureConfigurations(variable?._feature)
    if (configurations && configurations.length > 0) {
        const promises = configurations.map(async (config) => {
            const environment = await getEnvironment(config._environment)
            config.environmentName = environment?.name || config._environment
        })
        await Promise.all(promises)
    }
  }

  return {
    variable,
    feature,
    configurations
  };
};

export const getHoverString = async (
  variableKey: string,
  extensionUri: string
) => {
  const ACCESS_TOKEN: any = StateManager.getState(KEYS.ACCESS_TOKEN) || "";
  const PROJECT_KEY: any = StateManager.getState(KEYS.PROJECT_ID) || "";

  if (ACCESS_TOKEN.length === 0 || PROJECT_KEY.length === 0) {
    return;
  }

  let variableData = StateManager.getState(variableKey) as
    | VariableHoverData
    | undefined

  if (!variableData) {
    variableData = await fetchVariableData(variableKey)
    StateManager.setState(variableKey, variableData) 
  }

  const hoverString = new vscode.MarkdownString("")
  hoverString.isTrusted = true
  hoverString.supportHtml = true

  if (variableData) {
    hoverString.appendMarkdown(getHTML(variableData, extensionUri));
  }
  return hoverString;
};

const getHTML = (variableData: VariableHoverData, extensionUri: string) => {
  const toggleOnIcon = `<img src="${extensionUri}/icons/toggleon.svg" alt="toggle">`
  const toggleOffIcon = `<img src="${extensionUri}/icons/toggleoff.svg" alt="toggle">`

  const { variable, feature, configurations } = variableData

  const configs = configurations?.map((config) => {
    return `${config.environmentName}: ${config.status === 'active' ? toggleOnIcon : toggleOffIcon}`
    }) || []

  return `
Name: ${variable.name} \n
Key: ${variable.key}\n
${
    variable.description
    ? `Description: ${variable.description}`
    : ""
} \n
Status: ${variable.status} \n
${feature ? `Feature: ${feature.name}` : `Unassociated`} \n 
--------
${configs.join("<br/>")}
    `;
};
