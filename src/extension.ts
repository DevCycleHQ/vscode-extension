import * as vscode from 'vscode';
import { GlobalStateManager, KEYS } from './GlobalStateManager';
import { SidebarProvider } from './SidebarProvider';


interface featureFlagType {
	key: string
	dev: boolean
	staging: boolean
	prod: boolean
}

const featureFlagsCopy: featureFlagType[] = 
[
	{
		key: "jiraIntegration",
		dev: true,
		staging: true,
		prod: true,
	},
	{
		key: "githubIntegration",
		dev: false,
		staging: false,
		prod: false,
	}
]

const REGEX = /[A-Za-z0-9][.A-Za-z_\-0-9]*/;
const SCHEME_FILE = {
	scheme: 'file',
};
// const bool = '$(symbol-boolean)'
// const HOVER_ICON = '(symbol-boolean)'
// import hoverIcon from "hover-on.png"
// hoverIcon;

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
			const hoverString = new vscode.MarkdownString("");

			let flag: featureFlagType = {
				key: '',
				dev: false,
				staging: false,
				prod: false
			};

			featureFlagsCopy.map((object) => {
				if(object.key === word){
					flag = object;
				}
			})


            if (flag.key.length !== 0) {
				hoverString.isTrusted = true;
				// hoverString.appendMarkdown(`**${bool}**`)
				// hoverString.appendMarkdown(`**$(symbol-boolean)**`)
				// hoverString.appendMarkdown(`**(symbol-boolean)**`)
				// hoverString.appendMarkdown(`**$(symbol-boolean)**`)
				// hoverString.appendMarkdown(bool)
				hoverString.appendMarkdown('`\nFEATURE FLAG KEY:`')
				hoverString.appendMarkdown(` ${flag.key}`);
				hoverString.appendMarkdown(`\n\n**Dev**: `)
				hoverString.appendText(` ${flag.dev}\n\n`);
				hoverString.appendMarkdown(`**Staging**: `)
				hoverString.appendText(` ${flag.staging}\n\n`);
				hoverString.appendMarkdown(`**Prod**: `)
				hoverString.appendText(` ${flag.prod}`);

                return new vscode.Hover(hoverString);
            }
			else{
				console.log('does not exist')
				return null;
			}
        }
    });
}

export function deactivate() {}
