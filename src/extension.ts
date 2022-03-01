// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

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
	let disposable = vscode.commands.registerCommand('devcycle-featureflags.helloDVC', () => {
		vscode.window.showInformationMessage('Hello from DevCycle-FeatureFlags!');
	});

	context.subscriptions.push(disposable);

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

// this method is called when your extension is deactivated
export function deactivate() {}
