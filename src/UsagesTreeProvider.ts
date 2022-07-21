import * as vscode from "vscode"
import DevcycleCLIController from "./devcycleCliController";

export class UsagesTreeProvider implements vscode.TreeDataProvider<CodeUsageNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<CodeUsageNode | undefined | void> = new vscode.EventEmitter<CodeUsageNode | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<CodeUsageNode | undefined | void> = this._onDidChangeTreeData.event;
    private flagsSeen: CodeUsageNode[] = []

    constructor(
        private workspaceRoot: string | undefined,
        private devcycleCliController: DevcycleCLIController
    ) {}

    private handleClick(event:unknown) {
        vscode.window.showInformationMessage('click', {
            detail: JSON.stringify(event),
            modal: true
        })
    }

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

    private usageLineToNode(line:string) {
        const labelStart = line.indexOf('-') + 2
        const label = line.slice(labelStart)
        return new CodeUsageNode(label, vscode.TreeItemCollapsibleState.None)
    }

    private flagLineToNode(line:string) {
        const labelStart = line.indexOf('.') + 2
        const label = line.slice(labelStart)
        return new CodeUsageNode(label, vscode.TreeItemCollapsibleState.Collapsed)
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
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly children: CodeUsageNode[] = []
    ) {
        super(label, collapsibleState)
    }
}