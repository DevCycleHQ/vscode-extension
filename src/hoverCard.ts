import * as vscode from "vscode";
import {
  Variable,
  Feature,
  FeatureConfiguration,
  getVariable,
  getFeature,
  getEnvironment,
  getFeatureConfigurations,
} from "./cli";

type FeatureConfigurationWithEnvNames = FeatureConfiguration & {
  envName: string;
};

type VariableHoverData = {
  variable: Variable;
  feature?: Feature;
  configurations?: FeatureConfigurationWithEnvNames[];
};

const getVariableData = async (variableKey: string) => {
  // find variable
  const variable = await getVariable(variableKey);

  // find feature and configurations
  let feature: Feature | undefined;
  let featureConfigsWithEnvNames: FeatureConfigurationWithEnvNames[] = [];

  if (variable?._feature) {
    const featurePromise = getFeature(variable._feature).then(
      (featureResponse) => (feature = featureResponse)
    );

    const featureConfigsPromise = getFeatureConfigurations(
      variable._feature
    ).then(
      async (featureConfigurations: FeatureConfiguration[]) =>
        await Promise.all(
          featureConfigurations?.map(async (config) => {
            const environment = await getEnvironment(config._environment);
            featureConfigsWithEnvNames.push({
              ...config,
              envName: environment?.name || "",
            });
            return environment;
          })
        )
    );
    await Promise.all([featurePromise, featureConfigsPromise]);
  }

  return {
    variable,
    feature,
    configurations: featureConfigsWithEnvNames,
  };
};

export const getHoverString = async (
  variableKey: string,
  extensionUri: string
) => {

  const variableData = await getVariableData(variableKey)

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
    return `${config.envName}: ${config.status === 'active' ? toggleOnIcon : toggleOffIcon}`
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
