("use strict");
import * as vscode from "vscode";
import { SidebarProvider } from "./SidebarProvider";
import { GlobalStateManager, KEYS } from "./GlobalStateManager";
import { getFeatureStatuses } from "./api/getFeatureStatuses";
import { camelCase, snakeCase, capitalCase } from "change-case";
import DevcycleCLIController from "./devcycleCliController";
import { UsagesTreeProvider } from "./UsagesTreeProvider";

Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;

export const activate = async (context: vscode.ExtensionContext) => {
  GlobalStateManager.globalState = context.globalState;
  GlobalStateManager.clearState();
  const sidebarProvider = new SidebarProvider(context.extensionUri);
  const cliController = new DevcycleCLIController()

  const rootPath =
    vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : undefined;
  vscode.window.registerTreeDataProvider(
    'devcycleCodeUsages',
    new UsagesTreeProvider(rootPath, cliController, context)
  )

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "devcycle-sidebar",
      sidebarProvider
    )
  )

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

  context.subscriptions.push(vscode.commands.registerCommand(
    'devcycle-featureflags.select-project',
    async() => {
      const projects = await cliController.listProjects()
      await cliController.selectProject()
    }
  ))

  context.subscriptions.push(vscode.commands.registerCommand(
    'devcycle-featureflags.select-organization',
    async() => {
      await cliController.selectOrganization()
    }
  ))

  context.subscriptions.push(vscode.commands.registerCommand(
    'devcycle-featureflags.status',
    async() => {
      const status = await cliController.status()
      const statusSummary = status.hasAccessToken ? 'Logged in to DevCycle' : 'Not logged in to DevCycle'
      const options:vscode.MessageOptions = {
        detail: JSON.stringify(status, null, 2),
        modal: true
      }
      vscode.window.showInformationMessage(statusSummary, options)
    }
  ))

  context.subscriptions.push(vscode.commands.registerCommand(
    'devcycle-featureflags.show-reference',
    async(filePath:string, start:number, end:number) => {
      const document = await vscode.workspace.openTextDocument(filePath)
      await vscode.window.showTextDocument(document)
      const editor = vscode.window.activeTextEditor
      if(!editor) throw new Error('No active text editor')
      editor.selection = new vscode.Selection(start-1, 0, end, 0)
      editor.revealRange(editor.selection, vscode.TextEditorRevealType.InCenterIfOutsideViewport)
    }
  ))

  // On Hover
  // vscode.languages.registerHoverProvider(SCHEME_FILE, {
  //   async provideHover(document, position, token) {
  //     const ACCESS_TOKEN: any =
  //       GlobalStateManager.getState(KEYS.ACCESS_TOKEN) || "";
  //     const PROJECT_KEY: any =
  //       GlobalStateManager.getState(KEYS.PROJECT_ID) || "";
  //     let featureFlags: any =
  //       (GlobalStateManager.getState(KEYS.FEATURE_FLAGS)) || [];
  //     const range = document.getWordRangeAtPosition(position, REGEX);
  //     const FEATURE_KEY = document.getText(range);
      
	//   const hoverString = new vscode.MarkdownString("");
	//   const toggleOnIconPath = vscode.Uri.joinPath(context.extensionUri, "icons", "toggleon.svg");
	//   const toggleOffIconPath = vscode.Uri.joinPath(context.extensionUri, "icons", "toggleoff.svg");
	//   const toggleOnIcon = `<img src="${toggleOnIconPath}" alt="toggle">`;
	//   const toggleOffIcon = `<img src="${toggleOffIconPath}" alt="toggle">`;

  //     if (ACCESS_TOKEN.length === 0 || PROJECT_KEY.length === 0) return;
  //     if(featureFlags.length !== 0)
  //       featureFlags = JSON.parse(featureFlags)
        
  //     let selectedFlag = "";
  //     featureFlags.map((flag: any) => {
  //       const camel = camelCase(flag);
  //       const capitalSnake = snakeCase(flag).toUpperCase()
  //       if (flag === FEATURE_KEY || camel === FEATURE_KEY || capitalSnake === FEATURE_KEY) {
  //         selectedFlag = flag;
  //         // console.log(flag, FEATURE_KEY);
  //       }
  //     });
  //     // console.log("valid: ", valid);
  //     // console.log(
  //     //   "GET: ",
  //     //   `https://api.devcycle.com/v1/projects/${PROJECT_KEY}/features/${FEATURE_KEY}/configurations`
  //     // );
  //     // console.log("ACCESS_TOKEN: ", ACCESS_TOKEN);

  //     if (selectedFlag.length !== 0) {
  //       const status = await getFeatureStatuses(
  //         PROJECT_KEY,
  //         selectedFlag,
  //         ACCESS_TOKEN
  //       );
  //       // console.log("return statuses: ", status)
  //       hoverString.isTrusted = true;
	// 	hoverString.supportHtml = true;
  //       hoverString.appendMarkdown(`\nFEATURE FLAG KEY: \`${selectedFlag}\` \n\n`);
  //       hoverString.appendMarkdown(`* **Dev**: `);
  //       hoverString.appendMarkdown(` ${status?.dev ? toggleOnIcon: toggleOffIcon}\n\n`);
  //       hoverString.appendMarkdown(`* **Staging**: `);
  //       hoverString.appendMarkdown(` ${status?.staging ? toggleOnIcon: toggleOffIcon}\n\n`);
  //       hoverString.appendMarkdown(`* **Prod**: `);
  //       hoverString.appendMarkdown(` ${status?.prod ? toggleOnIcon: toggleOffIcon}`);
  //       return new vscode.Hover(hoverString);
  //     } else {
  //       // console.log("does not exist");
  //       return null;
  //     }
  //   },
  // });
};

export function deactivate() {}
