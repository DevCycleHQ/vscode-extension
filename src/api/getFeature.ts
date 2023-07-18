import axios from "axios";
import { StateManager, KEYS } from "../StateManager";
import { Variable } from "./getVariable";


export type Variation = {
  _id: string
  name: string
  key: string
  variables: {
    [key: Variable['key']]: string | boolean | number | Record<string, unknown>
  }
}


export type Feature = {
  name: string
  key: string
  description: string
  type?: 'release' | 'permission' | 'experiment' | 'ops'
  updatedAt: string
  variables: Variable[]
  variations: Variation[]
  tags?: string[]
}

export const getFeature = async (featureKey: string): Promise<Feature | undefined> => {
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
      url: `https://api.devcycle.com/v1/projects/${PROJECT_KEY}/features/${featureKey}`,
    });

    const { data } = resp
    return data
  } catch (err) {
    console.error(err)
    return
  }
}