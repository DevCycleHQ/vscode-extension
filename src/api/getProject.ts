import axios from "axios";
import { GlobalStateManager, KEYS } from "../GlobalStateManager";

export const getProject = async (id: string) => {
    let accessToken = await GlobalStateManager.getState(KEYS.ACCESS_TOKEN) || "";
    console.log(accessToken, "accessToken");
    try {
        const resp = await axios({
            method: 'GET',
			headers: {
				Authorization: `${accessToken}`,
			},
            url: `https://api.devcycle.com/v1/projects/${id}`,
            
        });
		return resp.data;
    } catch (err) {
        console.error(err);
    }
};
