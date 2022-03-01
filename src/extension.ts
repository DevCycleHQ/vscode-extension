("use strict");
import * as vscode from "vscode";
import { SidebarProvider } from "./SidebarProvider";
import { GlobalStateManager, KEYS } from "./GlobalStateManager";
import { getFeatureStatuses } from "./api/getFeatureStatuses";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;

const axios = require("axios");

const REGEX = /[A-Za-z0-9][.A-Za-z_\-0-9]*/;
const SCHEME_FILE = {
  scheme: "file",
};

export const activate = async (context: vscode.ExtensionContext) => {
  GlobalStateManager.globalState = context.globalState;
  GlobalStateManager.clearState();
  const sidebarProvider = new SidebarProvider(context.extensionUri);

  const item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "devcycle-sidebar",
      sidebarProvider
    )
  );

  // Activate DVC-Extension
  let disposable = vscode.commands.registerCommand(
    "devcycle-featureflags.helloDVC",
    async () => {
      vscode.window.showInformationMessage("Hello from DevCycle-FeatureFlags!");
      console.log("activated...");
    }
  );

  context.subscriptions.push(disposable);

  // On Hover
  vscode.languages.registerHoverProvider(SCHEME_FILE, {
    async provideHover(document, position, token) {
      const ACCESS_TOKEN: any = GlobalStateManager.getState(KEYS.ACCESS_TOKEN) || "";
      const PROJECT_KEY: any = GlobalStateManager.getState(KEYS.PROJECT_ID) || "";
      let featureFlags: string[] =
        GlobalStateManager.getStateAny("FEATURE_FLAGS") || [];
      const range = document.getWordRangeAtPosition(position, REGEX);
      const FEATURE_KEY = document.getText(range);
      const hoverString = new vscode.MarkdownString("");

      if(ACCESS_TOKEN.length === 0 || PROJECT_KEY.length === 0)return;
      
      let valid = false;
      featureFlags.map((flag) => {
        if (flag === FEATURE_KEY) {
          valid = true;
          console.log(flag, FEATURE_KEY);
        }
      });
      console.log("valid: ", valid);
      console.log("GET: ",  `https://api.devcycle.com/v1/projects/${PROJECT_KEY}/features/${FEATURE_KEY}/configurations`)
      console.log("ACCESS_TOKEN: ", ACCESS_TOKEN)

      if (valid) {
        const status = await getFeatureStatuses(PROJECT_KEY, FEATURE_KEY, ACCESS_TOKEN);
        hoverString.isTrusted = true;
        hoverString.appendMarkdown("`\nFEATURE FLAG KEY:`");
        hoverString.appendMarkdown(` ${FEATURE_KEY}`);
        hoverString.appendMarkdown(`\n\n**Dev**: `);
        hoverString.appendText(` ${status?.dev}\n\n`);
        hoverString.appendMarkdown(`**Staging**: `);
        hoverString.appendText(` ${status?.staging}\n\n`);
        hoverString.appendMarkdown(`**Prod**: `);
        hoverString.appendText(` ${status?.prod}`);
        return new vscode.Hover(hoverString);
      } else {
        console.log("does not exist");
        return null;
      }
    },
  });
};

export function deactivate() {}
