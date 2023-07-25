import axios from "axios";
import { getToken } from "../api/getToken";
import { getCredentials } from "../utils/credentials";

export const getProject = async (id: string) => {
    const { client_id, client_secret } = await getCredentials()
    if (!client_id || !client_secret) {
        throw new Error('Missing client_id or secret to get auth token')
    }
    let { access_token } = await getToken(client_id, client_secret)
    return await axios({
        method: 'GET',
        headers: {
            Authorization: `${access_token}`,
        },
        url: `https://api.devcycle.com/v1/projects/${id}`,
        
    }).then((res) => {
        return res.data;
    }).catch((error) => {
        return error.response.status;
    });
};
