import * as vscode from 'vscode';
import { GlobalStateManager, KEYS } from './GlobalStateManager';
import { SidebarProvider } from './SidebarProvider';


interface FeatureFlagType {
	key: string
	dev: boolean
	staging: boolean
	prod: boolean
}

const featureFlagsCopy: FeatureFlagType[] = 
[
	{
		key: "jiraIntegration",
		dev: true,
		staging: false,
		prod: true,
	},
	{
		key: "githubIntegration",
		dev: false,
		staging: false,
		prod: false,
	}
];

const REGEX = /[A-Za-z0-9][.A-Za-z_\-0-9]*/;
const SCHEME_FILE = {
	scheme: 'file',
};

export function activate(context: vscode.ExtensionContext) {
	GlobalStateManager.globalState = context.globalState;

	let disposable = vscode.commands.registerCommand('devcycle-featureflags.helloDVC', async () => {
		let testingState = GlobalStateManager.getState(KEYS.ACCESS_TOKEN);
		let testingState2 = GlobalStateManager.getState(KEYS.PROJECT_ID);
		console.log(testingState, testingState2);
	});

	context.subscriptions.push(disposable);

	
	console.log('Congratulations, your extension "devcycle-featureflags" is now active!');

	const sidebarProvider = new SidebarProvider(context.extensionUri);

	const item = vscode.window.createStatusBarItem(
	  vscode.StatusBarAlignment.Right
	);
  
	context.subscriptions.push(
	  vscode.window.registerWebviewViewProvider("devcycle-sidebar", sidebarProvider)
	);

	vscode.languages.registerHoverProvider(SCHEME_FILE, {
        provideHover(document, position, token) {

            const range = document.getWordRangeAtPosition(position, REGEX);
            const word = document.getText(range);
			const hoverString = new vscode.MarkdownString("", true);

			let flag: FeatureFlagType = {
				key: '',
				dev: false,
				staging: false,
				prod: false
			};

			featureFlagsCopy.map((object) => {
				if(object.key === word){
					flag = object;
				}
			});

			const toggleOnIconPath = vscode.Uri.joinPath(context.extensionUri, "icons", "toggleon.svg");
			const toggleOffIconPath = vscode.Uri.joinPath(context.extensionUri, "icons", "toggleoff.svg");
			const toggleOnIcon = `<img src="${toggleOnIconPath}" alt="toggle">`;
			const toggleOffIcon = `<img src="${toggleOffIconPath}" alt="toggle">`;
			

            if (flag.key.length !== 0) {
				hoverString.isTrusted = true;
				hoverString.supportHtml = true;
				hoverString.appendMarkdown(`\nFEATURE FLAG KEY: \`${flag.key}\` \n\n`);
				hoverString.appendMarkdown(`* **Dev**: ${flag.dev ? toggleOnIcon: toggleOffIcon} \n\n`);
				hoverString.appendMarkdown(`* **Staging**: ${flag.staging ? toggleOnIcon: toggleOffIcon} \n\n`);
				hoverString.appendMarkdown(`* **Prod**: ${flag.prod ? toggleOnIcon: toggleOffIcon} \n\n`);
                return new vscode.Hover(hoverString);
            }
			else{
				console.log('does not exist');
				return null;
			}
        }
    });
}

export function deactivate() {}
