("use strict");
import * as vscode from "vscode";
import { KEYS, StateManager } from "./StateManager";
import {
  init,
  login,
  logout,
  status as cliStatus,
  initStorage,
} from "./cli";
import { CLIENT_KEYS, SecretStateManager } from "./SecretStateManager";
import { SidebarProvider } from "./SidebarProvider";

import { UsagesTreeProvider } from "./UsagesTreeProvider";
import { getHoverString } from "./hoverCard";

Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;

const REGEX = /[A-Za-z0-9][.A-Za-z_\-0-9]*/;
const SCHEME_FILE = {
  scheme: "file",
};

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

export const activate = async (context: vscode.ExtensionContext) => {
  SecretStateManager.init(context);
  StateManager.globalState = context.globalState;
  StateManager.workspaceState = context.workspaceState;
  StateManager.clearState();
  const autoLogin = vscode.workspace
    .getConfiguration("devcycle-featureflags")
    .get("loginOnWorkspaceOpen");
  
    if (autoLogin) {
      const isLoggedIn = await autoLoginIfHaveCredentials()
      if (isLoggedIn) {
        await initStorage()
      }
    }
  
    const sidebarProvider = new SidebarProvider(context.extensionUri);

  const rootPath =
    vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length > 0
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : undefined;
  const usagesDataProvider = new UsagesTreeProvider(rootPath, context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "devcycle-sidebar",
      sidebarProvider
    )
  );
  vscode.window.registerTreeDataProvider(
    "devcycleCodeUsages",
    usagesDataProvider
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("devcycle-featureflags.init", async () => {
      await init();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("devcycle-featureflags.login", async () => {
      await login();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("devcycle-featureflags.openLink", async (link: string) => {
      vscode.env.openExternal(vscode.Uri.parse(link));
    })
  );


  context.subscriptions.push(
    vscode.commands.registerCommand(
      "devcycle-featureflags.logout",
      async () => {
        await Promise.all([
          SecretStateManager.instance.clearSecrets(),
          StateManager.clearState(),
          vscode.commands.executeCommand(
            "setContext",
            "devcycle-featureflags.hasCredentialsAndProject",
            false
          )
        ])
        // TODO we can probably remove logout() since we aren't logging into the CLI anymore
        await logout();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "devcycle-featureflags.refresh-usages",
      async () => {
        await usagesDataProvider.refresh();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "devcycle-featureflags.show-reference",
      async (filePath: string, start: number, end: number) => {
        const document = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(document);
        const editor = vscode.window.activeTextEditor;
        if (!editor) throw new Error("No active text editor");
        editor.selection = new vscode.Selection(start - 1, 0, end, 0);
        editor.revealRange(
          editor.selection,
          vscode.TextEditorRevealType.InCenterIfOutsideViewport
        );
      }
    )
  );

  const status = await cliStatus();
  if (status.organization) {
    await vscode.commands.executeCommand(
      "setContext",
      "devcycle-featureflags.repoConfigured",
      status.repoConfigExists
    );
    if (status.hasAccessToken) {
      await vscode.commands.executeCommand(
        "setContext",
        "devcycle-featureflags.loggedIn",
        status.hasAccessToken
      );
    }
  }
  if (status.repoConfigExists) {
    if (!status.hasAccessToken && autoLogin) {
      await login();
    }
    await vscode.commands.executeCommand(
      "devcycle-featureflags.refresh-usages"
    );
  }
  // On Hover
  vscode.languages.registerHoverProvider(SCHEME_FILE, {
    async provideHover(document, position) {
      const range = document.getWordRangeAtPosition(position, REGEX);
      const variableKey = document.getText(range);

      const hoverString = await getHoverString(
        variableKey,
        context.extensionUri.toString()
      );
      return new vscode.Hover(hoverString || "");
    },
  });
};

export function deactivate() { }
