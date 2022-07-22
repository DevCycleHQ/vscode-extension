import * as vscode from "vscode"
import DevcycleCLIController, { JSONMatch, VariableReference } from "./devcycleCliController";

export class UsagesTreeProvider implements vscode.TreeDataProvider<CodeUsageNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<CodeUsageNode | undefined | void> = new vscode.EventEmitter<CodeUsageNode | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<CodeUsageNode | undefined | void> = this._onDidChangeTreeData.event;
    private flagsSeen: CodeUsageNode[] = []

    constructor(
        private workspaceRoot: string | undefined,
        private devcycleCliController: DevcycleCLIController,
        private context: vscode.ExtensionContext
    ) { }

    async refresh(): Promise<void> {
        this.flagsSeen = []
        this._onDidChangeTreeData.fire();
        const root = this.workspaceRoot
        if (!root) {
            throw (new Error('Must have a workspace to check for code usages'))
        }
        const matches = await this.devcycleCliController.usages()
        matches.forEach(match => {
            this.flagsSeen.push(CodeUsageNode.flagFrom(match, root, this.context))
        })
        this.flagsSeen.sort((a, b) => (a.key > b.key) ? 1 : -1)
        this._onDidChangeTreeData.fire();
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
    static flagFrom(match: JSONMatch, workspaceRoot: string, context: vscode.ExtensionContext) {
        const children = match.references.map(reference => this.usageFrom(match, reference, workspaceRoot, context))
        const instance = new CodeUsageNode(match.key, match.key, 'flag', children)
        instance.key = match.key
        instance.iconPath = {
            dark: vscode.Uri.joinPath(context.extensionUri, 'media', 'flag-filled-white.svg'),
            light: vscode.Uri.joinPath(context.extensionUri, 'media', 'flag-filled.svg')
        }
        return instance
    }

    static usageFrom(match: JSONMatch, reference: VariableReference, workspaceRoot: string, context: vscode.ExtensionContext): CodeUsageNode {
        const start = reference.lineNumbers.start
        const end = reference.lineNumbers.end
        const label = (start === end)
            ? `${reference.fileName}:L${start}`
            : `${reference.fileName}:L${start}-${end}`
        const instance = new CodeUsageNode(match.key, label, 'usage')
        const file = vscode.Uri.file(`${workspaceRoot}/${reference.fileName}`)
        instance.command = {
            title: "",
            command: "devcycle-featureflags.show-reference",
            arguments: [file, start, end]
        }
        return instance
    }

    constructor(
        public key: string,
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