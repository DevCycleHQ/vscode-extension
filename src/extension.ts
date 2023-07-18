("use strict");
import * as vscode from "vscode";
import { GlobalStateManager, KEYS } from "./GlobalStateManager";
import DevcycleCLIController from "./devcycleCliController";
import { SecretStateManager } from "./SecretStateManager";
import { SidebarProvider } from "./SidebarProvider";

import { UsagesTreeProvider } from "./UsagesTreeProvider";
import { getFeatureStatuses } from "./api/getFeatureStatuses";
import { camelCase, snakeCase } from "change-case";

Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;

const REGEX = /[A-Za-z0-9][.A-Za-z_\-0-9]*/;
const SCHEME_FILE = {
  scheme: "file",
};

export const activate = async (context: vscode.ExtensionContext) => {
  SecretStateManager.init(context)
  GlobalStateManager.globalState = context.globalState;
  GlobalStateManager.clearState();
  const autoLogin = vscode.workspace.getConfiguration('devcycle-featureflags').get('loginOnWorkspaceOpen')
  const cliController = new DevcycleCLIController()
  const sidebarProvider = new SidebarProvider(context.extensionUri);

  const rootPath =
    vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : undefined;
  const usagesDataProvider = new UsagesTreeProvider(rootPath, cliController, context)
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "devcycle-sidebar",
      sidebarProvider
    )
  );
  vscode.window.registerTreeDataProvider(
    'devcycleCodeUsages',
    usagesDataProvider
  )

  context.subscriptions.push(vscode.commands.registerCommand(
    'devcycle-featureflags.init',
    async () => {
      await cliController.init()
    }
  ))

  context.subscriptions.push(vscode.commands.registerCommand(
    'devcycle-featureflags.login',
    async () => {
      await cliController.login()
    }
  ))

  context.subscriptions.push(vscode.commands.registerCommand(
    'devcycle-featureflags.logout',
    async () => {
      await cliController.logout()
    }
  ))

  context.subscriptions.push(vscode.commands.registerCommand(
    'devcycle-featureflags.refresh-usages',
    async () => {
      await usagesDataProvider.refresh()
    }
  ))

  context.subscriptions.push(vscode.commands.registerCommand(
    'devcycle-featureflags.show-reference',
    async (filePath: string, start: number, end: number) => {
      const document = await vscode.workspace.openTextDocument(filePath)
      await vscode.window.showTextDocument(document)
      const editor = vscode.window.activeTextEditor
      if (!editor) throw new Error('No active text editor')
      editor.selection = new vscode.Selection(start - 1, 0, end, 0)
      editor.revealRange(editor.selection, vscode.TextEditorRevealType.InCenterIfOutsideViewport)
    }
  ))

  const status = await cliController.status()
  if(status.organization) {
    await vscode.commands.executeCommand('setContext', 'devcycle-featureflags.repoConfigured', status.repoConfigExists)
    if(status.hasAccessToken) {
      cliController.loggedIn = true
      await vscode.commands.executeCommand('setContext', 'devcycle-featureflags.loggedIn', status.hasAccessToken)
    }
  }
  if(status.repoConfigExists) {
    if(!status.hasAccessToken && autoLogin) {
      await cliController.login()
    }
    await vscode.commands.executeCommand('devcycle-featureflags.refresh-usages')
  }

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
  })
}

export function deactivate() { }
