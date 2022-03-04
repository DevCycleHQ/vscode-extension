import axios from "axios";

export const getFeatureStatuses = async (
  PROJECT_KEY: string = "",
  FEATURE_KEY: string = "",
  ACCESS_TOKEN: string = ""
) => {
  return await axios({
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      authorization: ACCESS_TOKEN,
    },
    url: `https://api.devcycle.com/v1/projects/${PROJECT_KEY}/features/${FEATURE_KEY}/configurations`,
  })
    .then(({ data }) => {
      // console.log("data: ", data)
      return {
        dev: data[0].status === "active",
        staging: data[1].status === "active",
        prod: data[2].status === "active",
      };
    })
    .catch((e) => {
      console.error("error: ", e);
      return null;
    });
};
