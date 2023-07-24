import * as fs from 'fs'
import * as yaml from 'js-yaml'
import * as os from 'os'
import { CLIENT_KEYS, SecretStateManager } from "../SecretStateManager";
import { KEYS, StateManager } from "../StateManager";


function loadConfig() {
    const repoConfigPath = './.devcycle/config.yml';
    const globalConfigPath = `${os.homedir()}/.config/devcycle/config.yml`;

    // check for repo level config
    if (fs.existsSync(repoConfigPath)) {
        const repoFile = fs.readFileSync(repoConfigPath, 'utf8');
        return yaml.safeLoad(repoFile);
    }
    
    // check for global level config
    if (fs.existsSync(globalConfigPath)) {
        const globalFile = fs.readFileSync(globalConfigPath, 'utf8');
        return yaml.safeLoad(globalFile);
    }

    // return default config if no file exists
    return {
        client_id: '',
        client_secret: '',
    };
}

const autoLoginIfHaveCredentials = async () => {
    const clientId = await  SecretStateManager.instance.getSecret(CLIENT_KEYS.CLIENT_ID)
    const clientSecret = await  SecretStateManager.instance.getSecret(CLIENT_KEYS.CLIENT_SECRET)
    const projectId = await StateManager.getState(KEYS.PROJECT_ID)
    const hasAllCredentials = !!clientId && !!clientSecret && !!projectId
  
    await vscode.commands.executeCommand(
      "setContext",
      "devcycle-featureflags.hasCredentialsAndProject",
      hasAllCredentials
    );
  
    return hasAllCredentials
}
const config = loadConfig();
console.log(config);

export async function getClientIdAndSecret() {
    const secrets = SecretStateManager.instance
    const client_id = await secrets.getSecret(CLIENT_KEYS.CLIENT_ID)
    const client_secret = await secrets.getSecret(CLIENT_KEYS.CLIENT_SECRET)
    return { client_id, client_secret }
}