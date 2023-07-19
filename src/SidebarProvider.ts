import * as vscode from "vscode";
import { getProject } from "./api/getProject";
import { StateManager, KEYS } from "./StateManager";
import { SecretStateManager, CLIENT_KEYS } from "./SecretStateManager";
import { getToken } from "./api/getToken";
import { getNonce } from "./getNonce";
import FeaturesCLIController, { Feature } from "./cli/featuresCLIController";

const enum VIEWS {
  DEFAULT = "default",
  PROJECT_ID_VIEW = "projectIdView",
  SUCCESS = "success"
}

const enum ACTIONS {
  LOGIN = "login",
  SUBMIT_PROJECT_ID = "submitProjectId"
}

const enum ERRORS {
  LOGIN = "login",
  LOGIN_UNAUTHORIZED = "unauthorized",
  SUBMIT_PROJECT_ID = "submitProjectId",
  PROJECT_UNDEFINED = "projectUndefined"
}
interface Data {
  type: string,
  clientId?: string,
  secret?: string,
  projectId?: string
}
export class SidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;
  _doc?: vscode.TextDocument;
  constructor(private readonly _extensionUri: vscode.Uri ) { }

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,

      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data: Data) => {
      if (data.type === ACTIONS.LOGIN) {
        if (!data.clientId || !data.secret) {
          webviewView.webview.html = this._getHtmlForWebview(webviewView.webview, undefined, ERRORS.LOGIN);
        } else {
          // TODO remove this once we start using the secrets manager
          let res = await getToken(data.clientId, data.secret);
          if (res && res.access_token) {
            StateManager.setState(KEYS.ACCESS_TOKEN, res.access_token);
            webviewView.webview.html = this._getHtmlForWebview(webviewView.webview, VIEWS.PROJECT_ID_VIEW);
          } else if (res === 401) {
            webviewView.webview.html = this._getHtmlForWebview(webviewView.webview, undefined, ERRORS.LOGIN_UNAUTHORIZED);
          }
          // Remove up to here
          const secrets = SecretStateManager.instance
          await secrets.setSecret(CLIENT_KEYS.CLIENT_ID, data.clientId);
          await secrets.setSecret(CLIENT_KEYS.CLIENT_SECRET, data.secret);
        }
      } else if (data.type === ACTIONS.SUBMIT_PROJECT_ID) {
        if (!data.projectId) {
          webviewView.webview.html = this._getHtmlForWebview(webviewView.webview, VIEWS.PROJECT_ID_VIEW, ERRORS.SUBMIT_PROJECT_ID);
        } else {
          let res = await getProject(data.projectId);
          if (res._id) {
            StateManager.setState(KEYS.PROJECT_ID, data.projectId);
            StateManager.setState(KEYS.PROJECT_NAME, res.name);
            FeaturesCLIController.getAllFeatures()
            webviewView.webview.html = this._getHtmlForWebview(webviewView.webview, VIEWS.SUCCESS);
          } else if (res === 404) {
            webviewView.webview.html = this._getHtmlForWebview(webviewView.webview, VIEWS.PROJECT_ID_VIEW, ERRORS.PROJECT_UNDEFINED);
          }
        }
      }
    });
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel;
  }

  private getErrorHtml(error: ERRORS) {
    let errorMessage = "";
    if (error === ERRORS.LOGIN) {
      errorMessage = 'Please input both client id and secret to proceed.'
    } else if (error === ERRORS.SUBMIT_PROJECT_ID) {
      errorMessage = 'Please input project id to proceed.'
    } else if (error === ERRORS.LOGIN_UNAUTHORIZED) {
      errorMessage = 'Client id or secret is not correct. Please try again.'
    } else if (error === ERRORS.PROJECT_UNDEFINED) {
      errorMessage = 'Project not found. Please try again.'
    }
    return `<p style="color:#F48771;">${errorMessage}</p>`
  }

  private getScriptUri(webview: vscode.Webview, view: string): vscode.Uri {
    let script = "";
    if (view === VIEWS.DEFAULT) {
      script = "sidebar.js"
    } else if (view === VIEWS.PROJECT_ID_VIEW) {
      script = "getProjectIdView.js"
    }
    return webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "src", `scripts/${script}`)
    );
  }

  private getBodyHtml(view: string): string{
    let body = "";
    if (view === VIEWS.DEFAULT) {
      body = `<br/>
        <label>Client Id:</label>
        <input id="clientId" value="" type="text"></input>
        <label>Client Secret:</label>
        <input id="clientSecret" value="" type="text"></input>
        <button id="loginBtn">Login</button>`
    } else if (view === VIEWS.PROJECT_ID_VIEW) {
      body = `<br/>
        <b style="font-size: 16px;">Welcome!</b>
        <p>Please select the project by inputting the project id.</p>
        <br/>
        <label>Project Id:</label>
        <input id="projectId" value="" type="text"></input>
        <button id="submitBtn">Submit</button>`
    } else if (view === VIEWS.SUCCESS) {
      let currentProjectName = StateManager.getState(KEYS.PROJECT_NAME);
      let featureFlags = (StateManager.getState(KEYS.FEATURES) || {}) as Record<string, Feature>;
      const featureArray = Object.values(featureFlags).map((feature) => feature.name);
      let flagsHtml = "";
      featureArray.sort().forEach((flag)=> {
        flagsHtml += `<div style="cursor: pointer;">${flag}</div>`;
      })

      body = `<br/><p>You are now in project: <b>${currentProjectName}</b> !</p><br/><b>Feature Flags:</b>`
      body += flagsHtml;
    }
    return body;
  }

  private _getHtmlForWebview(webview: vscode.Webview, view: VIEWS = VIEWS.DEFAULT, error?: ERRORS) {
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );

    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );

    const scriptUri = this.getScriptUri(webview, view);

    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
        -->
        <meta http-equiv="Content-Security-Policy" content="img-src https: data:; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
        
        </head>
        <body>
        ${this.getBodyHtml(view)}
        ${error ? this.getErrorHtml(error) : ""}
        </body>
        <script nonce="${nonce}" src="${scriptUri}"></script>
        </html>`;
  }
}
