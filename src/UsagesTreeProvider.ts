import * as vscode from "vscode"
import { usages, JSONMatch, VariableReference, getAllVariables, Variable } from "./cli";

type VariableCodeReference = 
    Variable & { references?: VariableReference[] } 
    | JSONMatch


const collapsedMap = {
    flag: vscode.TreeItemCollapsibleState.Collapsed,
    usage: vscode.TreeItemCollapsibleState.None,
    detail: vscode.TreeItemCollapsibleState.None,
    header: vscode.TreeItemCollapsibleState.Expanded,
}

export class UsagesTreeProvider implements vscode.TreeDataProvider<CodeUsageNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<CodeUsageNode | undefined | void> = new vscode.EventEmitter<CodeUsageNode | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<CodeUsageNode | undefined | void> = this._onDidChangeTreeData.event;
    private flagsSeen: CodeUsageNode[] = []

    constructor(
        private workspaceRoot: string | undefined,
        private context: vscode.ExtensionContext
    ) { }

    async refresh(): Promise<void> {
        this.flagsSeen = []
        this._onDidChangeTreeData.fire(undefined);
        const root = this.workspaceRoot
        if (!root) {
            throw (new Error('Must have a workspace to check for code usages'))
        }
        const apiVariables = await getAllVariables();
        const matches = await usages(); 
        const mergedVariables = {...apiVariables} as Record<string, VariableCodeReference>;

        matches.forEach((usage) => {
          if (mergedVariables[usage.key]) {
            mergedVariables[usage.key].references  = usage.references;
          } else {
            mergedVariables[usage.key] = usage;
          }
        });
  
        Object.values(mergedVariables).forEach(match => {
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

        if (element) {
            return element.children
        }

        return this.flagsSeen
    }
}

export class CodeUsageNode extends vscode.TreeItem {
    static flagFrom(match: VariableCodeReference, workspaceRoot: string, context: vscode.ExtensionContext) {
        const children = []
        if ('_id' in match) {
            const detailsChildNodes = [
                new CodeUsageNode(match.key+':status', `Status`, 'detail', [], match.status),
                new CodeUsageNode(match.key+':id', `ID`, 'detail', [], match._id),
            ]
            
            if (match.description?.length) { 
                detailsChildNodes.unshift(new CodeUsageNode(match.key+':description', `Description`, 'detail', [], match.description))
            }
            if (match.name?.length) { 
                detailsChildNodes.unshift(new CodeUsageNode(match.key+':name', `Name`, 'detail', [], match.name))
            }

            const variableDetailsRoot = new CodeUsageNode(match.key, 'Details', 'header', detailsChildNodes)
            children.push(variableDetailsRoot)
        }

        if (match.references) {
            const usagesChildNodes = match.references?.map(reference => this.usageFrom(match, reference, workspaceRoot))
            const usagesRoot = new CodeUsageNode(match.key, 'Usages', 'header', usagesChildNodes)
            children.push(usagesRoot)
        }

        const instance = new CodeUsageNode(match.key, match.key, 'flag', children)
        instance.key = match.key
        instance.iconPath = {
            dark: vscode.Uri.joinPath(context.extensionUri, 'media', 'flag-filled-white.svg'),
            light: vscode.Uri.joinPath(context.extensionUri, 'media', 'flag-filled.svg')
        }
        return instance
    }

    static usageFrom(match: VariableCodeReference, reference: VariableReference, workspaceRoot: string): CodeUsageNode {
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
        public type: 'flag' | 'usage' | 'header' | 'detail',
        public readonly children: CodeUsageNode[] = [],
        public description?: string,
    ) {
        super(label, collapsedMap[type])
        this.contextValue = type
    }
}
