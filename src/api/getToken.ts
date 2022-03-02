import axios from "axios";

export const getToken = async (id: string = "", secret: string = "") => {
    try {
        const resp = await axios({
            method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
            url: 'https://auth.devcycle.com/oauth/token',
            data: {
                "client_id": id || "",
				"client_secret": secret || "",
				"audience": "https://api.devcycle.com/",
				"grant_type": "client_credentials"
            }
        });
		return resp.data;
    } catch (err) {
        console.error(err);
    }
};
