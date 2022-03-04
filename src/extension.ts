("use strict");
import * as vscode from "vscode";
import { SidebarProvider } from "./SidebarProvider";
import { GlobalStateManager, KEYS } from "./GlobalStateManager";
import { getFeatureStatuses } from "./api/getFeatureStatuses";
import { camelCase, snakeCase, capitalCase } from "change-case";

Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;

const REGEX = /[A-Za-z0-9][.A-Za-z_\-0-9]*/;
const SCHEME_FILE = {
  scheme: "file",
};

export const activate = async (context: vscode.ExtensionContext) => {
  GlobalStateManager.globalState = context.globalState;
  GlobalStateManager.clearState();
  const sidebarProvider = new SidebarProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "devcycle-sidebar",
      sidebarProvider
    )
  );

  // Activate DVC-Extension
  context.subscriptions.push(vscode.commands.registerCommand(
    "devcycle-featureflags.helloDVC",
    async () => {
      vscode.window.showInformationMessage("Hello from DevCycle-FeatureFlags!");
      console.log("activated...");
    }
  ));
  vscode.commands.executeCommand('devcycle-featureflags.helloDVC')

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
        // console.log("does not exist");
        return null;
      }
    },
  });
};

export function deactivate() {}
