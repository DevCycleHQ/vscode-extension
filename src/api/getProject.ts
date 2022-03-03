import axios from "axios";
import { GlobalStateManager, KEYS } from "../GlobalStateManager";

export const getProject = async (id: string) => {
    let accessToken = await GlobalStateManager.getState(KEYS.ACCESS_TOKEN) || "";

        return await axios({
            method: 'GET',
			headers: {
				Authorization: `${accessToken}`,
			},
            url: `https://api.devcycle.com/v1/projects/${id}`,
            
        }).then((res) => {
            return res.data;
        }).catch((error) => {
            return error.response.status;
        });
};
