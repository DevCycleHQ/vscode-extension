import * as vscode from "vscode";
import { getProject } from "./api/getProject";
import { GlobalStateManager, KEYS } from "./GlobalStateManager";
import { getFeatureFlags } from "./api/getFeatureFlags";
import { getToken } from "./api/getToken";
import { getNonce } from "./getNonce";

const PROJECT_KEY = "jolis-tt";

export class SidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;
  _doc?: vscode.TextDocument;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,

      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      if (data.type === "login") {
        let res = await getToken(data.clientId, data.secret);
        if (res && res.access_token) {
          GlobalStateManager.setState(KEYS.ACCESS_TOKEN, res.access_token);
        }
        webviewView.webview.html = this.getProjectIdWebview(webviewView.webview);
      } else if (data.type === "submitProjectId") {
        let res = await getProject(data.projectId);
        if (res._id) {
          GlobalStateManager.setState(KEYS.PROJECT_ID, data.projectId);
          await getFeatureFlags(data.projectId, GlobalStateManager.getState(KEYS.ACCESS_TOKEN));
        }
      }
    });
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel;
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "src", "scripts/sidebar.js")
    );

    const getTokenUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "src", "api/getToken.ts")
    );

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
        <label>Client Id:</label>
        <input id="clientId" value="" type="text"></input>
        <label>Client Secret:</label>
        <input id="clientSecret" value="" type="text"></input>
        <button id="loginBtn">Login</button>
        </body>
        <script nonce="${nonce}" src="${scriptUri}"></script>
        </html>`;
  }

  private getProjectIdWebview(webview: vscode.Webview) {
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "src", "scripts/getProjectIdView.js")
    );

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
          <h1>HI DUMMY</h1>
          <label>Project Id:</label>
          <input id="projectId" value="" type="text"></input>
          <button id="submitBtn">Submit</button>
        </body>
        <script nonce="${nonce}" src="${scriptUri}"></script>
        </html>`;
  }
}
