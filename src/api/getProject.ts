import axios from "axios";
import { SecretStateManager, CLIENT_KEYS } from "../SecretStateManager";
import { getToken } from "../api/getToken";

export const getProject = async (id: string) => {
    const secrets = SecretStateManager.instance;
    const client_id = await secrets.getSecret(CLIENT_KEYS.CLIENT_ID);
    const client_secret = await secrets.getSecret(CLIENT_KEYS.CLIENT_SECRET);
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
