import axios from "axios";
import { StateManager, KEYS } from "../StateManager";

export type Environment = {
  name: string
}

export const getEnvironment = async (environmentId: string): Promise<Environment | undefined> => {
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
      url: `https://api.devcycle.com/v1/projects/${PROJECT_KEY}/environments/${environmentId}`,
    });

    const { data } = resp
    return data
  } catch (err) {
    console.error(err)
    return
  }
}