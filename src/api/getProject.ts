import axios from "axios";
import { StateManager, KEYS } from "../StateManager";

export const getProject = async (id: string) => {
    let accessToken = await StateManager.getState(KEYS.ACCESS_TOKEN) || "";

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
