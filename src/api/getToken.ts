import axios from "axios";

export const getToken = async (id: string, secret: string) => {

        return await axios({
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
        }).then((res)=> {
            return res.data;
        }).catch((error) => {
            return error.response.status;
        });
  
};
