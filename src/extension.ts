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
  const autoLogin = vscode.workspace.getConfiguration('devcycle-featureflags').get('loginOnWorkspaceOpen')
  const cliController = new DevcycleCLIController()

  const rootPath =
    vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : undefined;
  const usagesDataProvider = new UsagesTreeProvider(rootPath, cliController, context)
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
    'devcycle-featureflags.select-project',
    async () => {
      const projects = await cliController.listProjects()
      await cliController.selectProject()
    }
  ))

  context.subscriptions.push(vscode.commands.registerCommand(
    'devcycle-featureflags.select-organization',
    async () => {
      await cliController.selectOrganization()
    }
  ))

  context.subscriptions.push(vscode.commands.registerCommand(
    'devcycle-featureflags.status',
    async () => {
      const status = await cliController.status()
      const statusSummary = status.hasAccessToken ? 'Logged in to DevCycle' : 'Not logged in to DevCycle'
      const options: vscode.MessageOptions = {
        detail: JSON.stringify(status, null, 2),
        modal: true
      }
      vscode.window.showInformationMessage(statusSummary, options)
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
      await vscode.commands.executeCommand('setContext', 'devcycle-featureflags.loggedIn', status.hasAccessToken)
    }
  }
  if(status.repoConfigExists) {
    if(!status.hasAccessToken && autoLogin) {
      await cliController.login()
    }
    await vscode.commands.executeCommand('devcycle-featureflags.refresh-usages')
  }
};

export function deactivate() { }
