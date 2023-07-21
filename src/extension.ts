("use strict");
import * as vscode from "vscode";
import { StateManager } from "./StateManager";
import {
  init,
  login,
  logout,
  status as cliStatus,
  getAllVariables,
  getAllFeatures,
  getAllEnvironments,
} from "./cli";
import { SecretStateManager, CLIENT_KEYS } from "./SecretStateManager";
import { SidebarProvider } from "./SidebarProvider";

import { UsagesTreeProvider } from "./UsagesTreeProvider";
import { getHoverString } from "./hoverCard";

Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;

const REGEX = /[A-Za-z0-9][.A-Za-z_\-0-9]*/;
const SCHEME_FILE = {
  scheme: "file",
};

export const activate = async (context: vscode.ExtensionContext) => {
  SecretStateManager.init(context);
  StateManager.globalState = context.globalState;
  StateManager.workspaceState = context.workspaceState;
  StateManager.clearState();
  const autoLogin = vscode.workspace
    .getConfiguration("devcycle-featureflags")
    .get("loginOnWorkspaceOpen");
  const sidebarProvider = new SidebarProvider(context.extensionUri);
  const secrets = SecretStateManager.instance
  const client_id = await secrets.getSecret(CLIENT_KEYS.CLIENT_ID)
  const client_secret = await secrets.getSecret(CLIENT_KEYS.CLIENT_SECRET)
  if (client_id && client_secret) {
    await Promise.all([
      getAllVariables(),
      getAllFeatures(),
      getAllEnvironments(),
    ]);
  }
  
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
    vscode.commands.registerCommand(
      "devcycle-featureflags.logout",
      async () => {
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
