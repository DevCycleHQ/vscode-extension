import axios from "axios";
import { StateManager, KEYS } from "../StateManager";

export type Variable = {
    _id: string
    _project: string
    _feature?: string
    name?: string
    description?: string
    key: string
    type: 'String' | 'Boolsean' | 'Number' | 'JSON'
    status: 'active' | 'archived'
    source: string
    _createdBy?: string
    createdAt: Date
    updatedAt: Date
}

export const getVariable = async (variableKey: string): Promise<Variable | undefined> => {
  try {
    const ACCESS_TOKEN = StateManager.getState(KEYS.ACCESS_TOKEN) as string
    const PROJECT_KEY = StateManager.getState(KEYS.PROJECT_ID)
    if (!ACCESS_TOKEN || !PROJECT_KEY) return

    const resp = await axios({
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        authorization: ACCESS_TOKEN as string,
      },
      url: `https://api.devcycle.com/v1/projects/${PROJECT_KEY}/variables/${variableKey}`,
    });

    const { data } = resp
    return data
  } catch (err) {
    console.error(err)
    return
  }
}