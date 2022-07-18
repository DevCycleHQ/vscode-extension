("use strict");
import * as vscode from "vscode";
import { SidebarProvider } from "./SidebarProvider";
import { GlobalStateManager, KEYS } from "./GlobalStateManager";
import { getFeatureStatuses } from "./api/getFeatureStatuses";
import { camelCase, snakeCase, capitalCase } from "change-case";
import DevcycleCLIController from "./devcycleCliController";

Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;

const REGEX = /[A-Za-z0-9][.A-Za-z_\-0-9]*/;
const SCHEME_FILE = {
  scheme: "file",
};

const getActiveWorkspace = () => {
  if(vscode.workspace.workspaceFolders?.length == 1) {
    return vscode.workspace.workspaceFolders[0]
  }
  if(!vscode.window.activeTextEditor) {
    return null
  }
  const editorPath = vscode.window.activeTextEditor.document.uri
  const workspace = vscode.workspace.getWorkspaceFolder(editorPath)
  if(!workspace) {
    vscode.window.showErrorMessage('No workspace found')
  }
  return workspace
}

export const activate = async (context: vscode.ExtensionContext) => {
  GlobalStateManager.globalState = context.globalState;
  GlobalStateManager.clearState();
  const sidebarProvider = new SidebarProvider(context.extensionUri);
  let workspace:vscode.WorkspaceFolder | undefined
  if(vscode.workspace.workspaceFolders?.length == 1) {
    workspace = vscode.workspace.workspaceFolders[0]
  } else if(!vscode.window.activeTextEditor) {
    vscode.window.showErrorMessage('Unable to identify workspace')
    return
  } else {
    const editorPath = vscode.window.activeTextEditor.document.uri
    const workspaceFromEditorPath = vscode.workspace.getWorkspaceFolder(editorPath)
    if(workspaceFromEditorPath) {
      workspace = workspaceFromEditorPath
    }
  }

  if(!workspace) {
    vscode.window.showErrorMessage('Unable to identify workspace')
    return
  }
  
  const cliController = new DevcycleCLIController(workspace)

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "devcycle-sidebar",
      sidebarProvider
    )
  )

  // Activate DVC-Extension
  context.subscriptions.push(vscode.commands.registerCommand(
    'devcycle-featureflags.login',
    async() => {
      await cliController.login()
    }
  ))

  context.subscriptions.push(vscode.commands.registerCommand(
    'devcycle-featureflags.logout',
    async() => {
      await cliController.logout()
    }
  ))

  // On Hover
  vscode.languages.registerHoverProvider(SCHEME_FILE, {
    async provideHover(document, position, token) {
      const ACCESS_TOKEN: any =
        GlobalStateManager.getState(KEYS.ACCESS_TOKEN) || "";
      const PROJECT_KEY: any =
        GlobalStateManager.getState(KEYS.PROJECT_ID) || "";
      let featureFlags: any =
        (GlobalStateManager.getState(KEYS.FEATURE_FLAGS)) || [];
      const range = document.getWordRangeAtPosition(position, REGEX);
      const FEATURE_KEY = document.getText(range);
      
	  const hoverString = new vscode.MarkdownString("");
	  const toggleOnIconPath = vscode.Uri.joinPath(context.extensionUri, "icons", "toggleon.svg");
	  const toggleOffIconPath = vscode.Uri.joinPath(context.extensionUri, "icons", "toggleoff.svg");
	  const toggleOnIcon = `<img src="${toggleOnIconPath}" alt="toggle">`;
	  const toggleOffIcon = `<img src="${toggleOffIconPath}" alt="toggle">`;

      if (ACCESS_TOKEN.length === 0 || PROJECT_KEY.length === 0) return;
      if(featureFlags.length !== 0)
        featureFlags = JSON.parse(featureFlags)
        
      let selectedFlag = "";
      featureFlags.map((flag: any) => {
        const camel = camelCase(flag);
        const capitalSnake = snakeCase(flag).toUpperCase()
        if (flag === FEATURE_KEY || camel === FEATURE_KEY || capitalSnake === FEATURE_KEY) {
          selectedFlag = flag;
          // console.log(flag, FEATURE_KEY);
        }
      });
      // console.log("valid: ", valid);
      // console.log(
      //   "GET: ",
      //   `https://api.devcycle.com/v1/projects/${PROJECT_KEY}/features/${FEATURE_KEY}/configurations`
      // );
      // console.log("ACCESS_TOKEN: ", ACCESS_TOKEN);

      if (selectedFlag.length !== 0) {
        const status = await getFeatureStatuses(
          PROJECT_KEY,
          selectedFlag,
          ACCESS_TOKEN
        );
        // console.log("return statuses: ", status)
        hoverString.isTrusted = true;
		hoverString.supportHtml = true;
        hoverString.appendMarkdown(`\nFEATURE FLAG KEY: \`${selectedFlag}\` \n\n`);
        hoverString.appendMarkdown(`* **Dev**: `);
        hoverString.appendMarkdown(` ${status?.dev ? toggleOnIcon: toggleOffIcon}\n\n`);
        hoverString.appendMarkdown(`* **Staging**: `);
        hoverString.appendMarkdown(` ${status?.staging ? toggleOnIcon: toggleOffIcon}\n\n`);
        hoverString.appendMarkdown(`* **Prod**: `);
        hoverString.appendMarkdown(` ${status?.prod ? toggleOnIcon: toggleOffIcon}`);
        return new vscode.Hover(hoverString);
      } else {
        // console.log("does not exist");
        return null;
      }
    },
  });
};

export function deactivate() {}
