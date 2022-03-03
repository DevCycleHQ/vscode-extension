import axios from "axios";
import { GlobalStateManager, KEYS } from "../GlobalStateManager";

export const getFeatureFlags = async (
  PROJECT_KEY: string = "",
  ACCESS_TOKEN: any = ""
) => {
  try {
      console.log("getting feature flags")
    // Get all DVC Feature Flags
    const resp = await axios({
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        authorization: ACCESS_TOKEN,
      },
      url: `https://api.devcycle.com/v1/projects/${PROJECT_KEY}/features`,
    });

    const { data } = resp;
    let featureFlags: string[] = [];
    data.map(({ key }: any) => featureFlags.push(key));
    console.log("feature flag response...")
    GlobalStateManager.setState(KEYS.FEATURE_FLAGS, JSON.stringify(featureFlags))
  } catch (err) {
    console.error(err);
  }
};
