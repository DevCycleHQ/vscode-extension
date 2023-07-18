import axios from "axios";
import { KEYS, StateManager } from "../StateManager";

export type FeatureConfiguration = {
  _id: string
  _project: string
  _environment: string
  _feature: string
  name: string
  status: 'active' | 'inactive' | 'archived'
  enabled: boolean
  readonly: boolean
}

export const getFeatureConfigurations = async (
  featureKey: string
) => {
  const ACCESS_TOKEN = StateManager.getState(KEYS.ACCESS_TOKEN) as string
  const PROJECT_KEY = StateManager.getState(KEYS.PROJECT_ID)
  if (!ACCESS_TOKEN || !PROJECT_KEY) return

  const { data } = await axios({
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      authorization: ACCESS_TOKEN,
    },
    url: `https://api.devcycle.com/v1/projects/${PROJECT_KEY}/features/${featureKey}/configurations`,
  })

  return data
}
