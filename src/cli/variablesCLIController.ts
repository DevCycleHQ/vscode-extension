import * as vscode from "vscode";
import { KEYS, StateManager } from "../StateManager";
import { execDvc } from "./baseCLIController";

export type Variable = {
  key: string;
  _feature: string;
  _id: string;
  name: string;
  description?: string;
  status: "active" | "archived";
};

export async function getVariable(variableKey: string) {
  const variables =
    (StateManager.getState(KEYS.VARIABLES) as Record<string, Variable>) || {};
  const variable = variables[variableKey];
  if (variable) {
    return variable;
  }

  const { code, error, output } = await execDvc(
    `variables get --keys='${variableKey}'`
  );
  if (code !== 0) {
    vscode.window.showErrorMessage(
      `Retrieving feature ${variableKey} failed: ${error?.message}}`
    );
    return;
  } else {
    // add the missing variable to the state
    const variablesResult = JSON.parse(output);
    if (!variablesResult || !variablesResult.length) {
      return;
    }
    const variable = variablesResult[0];
    variables[variableKey] = variable;
    StateManager.setState(KEYS.VARIABLES, variables);
    return variable;
  }
}

export async function getAllVariables() {
  const variables = StateManager.getState(KEYS.VARIABLES) as Record<
    string,
    Variable
  >;
  if (variables) {
    return variables;
  }
  const { code, error, output } = await execDvc("variables get");
  if (code !== 0) {
    vscode.window.showErrorMessage(
      `Retrieving variables failed: ${error?.message}}`
    );
    return [];
  } else {
    const variables = JSON.parse(output) as Variable[];
    const variableMap = variables.reduce((result, currentVariable) => {
      result[currentVariable.key] = currentVariable;
      return result;
    }, {} as Record<string, Variable>);

    StateManager.setState(KEYS.VARIABLES, variableMap);
    return variableMap;
  }
}
