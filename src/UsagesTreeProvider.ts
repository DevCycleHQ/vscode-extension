import * as vscode from "vscode"
import DevcycleCLIController from "./devcycleCliController";

export class UsagesTreeProvider implements vscode.TreeDataProvider<CodeUsageNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<CodeUsageNode | undefined | void> = new vscode.EventEmitter<CodeUsageNode | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<CodeUsageNode | undefined | void> = this._onDidChangeTreeData.event;
    private flagsSeen: CodeUsageNode[] = []

    constructor(
        private workspaceRoot: string | undefined,
        private devcycleCliController: DevcycleCLIController,
        private context:vscode.ExtensionContext
    ) { }

    async refresh(): Promise<void> {
        const raw = await this.devcycleCliController.usages()
        const lines = raw.split('\n').slice(3)
        lines.forEach((line) => {
            if (line.startsWith('\t')) {
                const flag = this.flagsSeen[this.flagsSeen.length - 1]
                flag.children.push(this.usageLineToNode(line))
            } else {
                this.flagsSeen.push(this.flagLineToNode(line))
            }
        })
        this._onDidChangeTreeData.fire();
    }

    private usageLineToNode(line: string) {
        const fileNameStart = line.indexOf('-') + 2
        const path = line.slice(fileNameStart)
        const [fileName, lineNumber] = path.split(':L')
        return CodeUsageNode.createUsage(fileName, lineNumber, this.workspaceRoot || '', this.context)
    }

    private flagLineToNode(line: string) {
        const labelStart = line.indexOf('.') + 2
        const label = line.slice(labelStart)
        return CodeUsageNode.createFlag(label, this.context)
    }

    getTreeItem(element: CodeUsageNode): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: CodeUsageNode): Promise<CodeUsageNode[]> {
        if (!this.workspaceRoot) {
            vscode.window.showInformationMessage('No dependency in empty workspace');
            return []
        }

        if (this.flagsSeen.length == 0) {
            await this.refresh()
        }

        if (element) {
            return element.children
        }

        return this.flagsSeen
    }
}

export class CodeUsageNode extends vscode.TreeItem {
    static createFlag = (line:string, context:vscode.ExtensionContext) => {

        const instance = new CodeUsageNode(line, 'flag')
        instance.iconPath = {
            dark: vscode.Uri.joinPath(context.extensionUri, 'media', 'togglebot-white.svg'),
            light: vscode.Uri.joinPath(context.extensionUri, 'media', 'togglebot.svg')
        }
        return instance
    }

    static createUsage = (filePath:string, lineNumber:string, workspaceRoot:string, context:vscode.ExtensionContext) => {
        const instance = new CodeUsageNode(`${filePath}:${lineNumber}`, 'usage')
        const file = vscode.Uri.file(`${workspaceRoot}/${filePath}`)
        instance.command = {
            title: "",
            command: "devcycle-featureflags.show-reference",
            arguments: [file, parseInt(lineNumber)]
        }
        return instance
    }

    public file:vscode.Uri | undefined

    constructor(
        public readonly label: string,
        public type: 'flag' | 'usage',
        public readonly children: CodeUsageNode[] = []
    ) {
        super(label, type === 'flag'
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None
        )
        this.contextValue = type
    }
}