import { isVariableDeclaration, Node, Symbol, createIdentifier, SyntaxKind, isExportSpecifier, createModifier, NodeFlags, isSourceFile, createSourceFile, ScriptTarget, ScriptKind, Statement, createPrinter, createModuleDeclaration, createModuleBlock, isImportTypeNode, createTypeReferenceNode, ImportTypeNode } from 'typescript';
import { ReferencesMap, collect } from './collect';
import { removeModifier, addModifier, hasModifier, traverse } from './helpers/ast';

function renameSymbol(symbol: Symbol, references: ReferencesMap, collected: Map<string, Symbol>, suggested?: string) {
    let baseName = suggested || (symbol.getDeclarations()[0] as any).name.escapedText;
    while (collected.has(baseName)) {
        let matchAlias = baseName.match(/_(\d+)$/);
        if (matchAlias) {
            baseName = baseName.replace(/_(\d+)$/, `_${parseInt(matchAlias[1]) + 1}`);
        } else {
            baseName += '_1';
        }
    }
    if (baseName !== symbol.getName()) {
        collected.set(baseName, symbol);
        (symbol as any)._escapedName = symbol.getName();
        (symbol.escapedName as string) = baseName;
        symbol.getDeclarations().forEach((declaration) => {
            (declaration as any).name = createIdentifier(baseName);
        });
        let refs = references.get(symbol) || [];
        refs.forEach((ref) => {
            ref.escapedText = baseName;
        });
    }
}

export function bundle(fileName: string) {
    const { typechecker, symbols, references, exported } = collect(fileName);
    const collected: Map<string, Symbol> = new Map();
    const nodes: Array<[Node, Symbol]> = symbols.reduce((list:  Array<[Node, Symbol]>, symbol) => {
        const sourceFile = symbol.getDeclarations()[0].getSourceFile();
        if (sourceFile.fileName.includes('node_modules')) {
            return list;
        }
        symbol.getDeclarations()
            .forEach((declaration) => {
                let node: Node = declaration;
                if (isVariableDeclaration(declaration)) {
                    node = declaration.parent.parent;
                }
                removeModifier(node, SyntaxKind.DefaultKeyword);
                removeModifier(node, SyntaxKind.ExportKeyword);
                list.push([node, symbol]);
            });
        return list;
    }, []);
    exported.forEach((sym) => {
        let refs = nodes.filter(([node, symbol]) => symbol === sym);
        if (refs.length) {
            refs.forEach(([node]) => {
                addModifier(node, SyntaxKind.ExportKeyword, true);
            });
            collected.set(sym.getName(), sym);
            return;
        }
        let declaration = sym.getDeclarations()[0];
        if (!isExportSpecifier(declaration)) {
            return;
        }
        let alias = typechecker.getAliasedSymbol(sym);
        if (!alias) {
            return;
        }
        let aliasDeclaration = alias.getDeclarations()[0];
        if (isSourceFile(aliasDeclaration)) {
            let aliasExportSymbols = typechecker.getExportsOfModule(alias);
            let indexes = [];
            let aliasExportNodes = aliasExportSymbols.reduce((list, exportSymbol) => {
                list.push(...nodes
                    .filter(([node, symbol], index) => {
                        if (symbol === exportSymbol) {
                            indexes.push(index);
                            return true;
                        }
                        return false;
                    })
                    .map(([ node ]) => node)
                );
                return list;
            }, []);
            let node = createModuleDeclaration([], [createModifier(SyntaxKind.ExportKeyword), createModifier(SyntaxKind.DeclareKeyword)], createIdentifier(sym.getName()), createModuleBlock(
                aliasExportNodes.map((node) => {
                    removeModifier(node, SyntaxKind.DeclareKeyword);
                    addModifier(node, SyntaxKind.ExportKeyword, true);
                    return node;
                })
            ), NodeFlags.Namespace);
            node.parent = aliasDeclaration;
            indexes.sort().forEach((index, i) => {
                nodes.splice(index - i, 1);
            });
            collected.set(sym.getName(), undefined);
            nodes.push([node, undefined]);
            return;
        }
        refs = nodes.filter(([node, symbol]) => symbol === alias);
        refs.forEach(([node]) => {
            addModifier(node, SyntaxKind.ExportKeyword, true);
        });
        renameSymbol(alias, references, collected, sym.getName());
        collected.set(sym.getName(), alias);
    });
    const statements: Statement[] = nodes.map(([node, symbol]) => {
        if (symbol) {
            let symbolName = symbol.getName();
            if (symbolName === 'default') {
                let declaration = symbol.getDeclarations()[0];
                if ((declaration as any).name) {
                    renameSymbol(symbol, references, collected, (declaration as any).name.getText());
                } else {
                    renameSymbol(symbol, references, collected, '__default');
                }
            } else if (collected.get(symbolName) !== symbol) {
                if (collected.has(symbolName)) {
                    renameSymbol(symbol, references, collected);
                } else {
                    collected.set(symbolName, symbol);
                }
            }
        }
        if (!hasModifier(node, SyntaxKind.DeclareKeyword)) {
            addModifier(node, SyntaxKind.DeclareKeyword);
        }
        return node as Statement;
    });
    const printer = createPrinter();
    const code = statements
        .map((node) => {
            traverse(node, (node) => {
                let type: ImportTypeNode = (node as any).type;
                if (type && isImportTypeNode(type)) {
                    let sourceSymbol = typechecker.getSymbolAtLocation(type);
                    if (!sourceSymbol) {
                        return;
                    }
                    let typeSymbol = sourceSymbol.exports.get(type.qualifier.getText() as any);
                    if (!typeSymbol) {
                        return;
                    }
                    (node as any).type = createTypeReferenceNode(typeSymbol.getName(), []);
                }
            });
            return node;
        })
        .map((node) => printer.printNode(4, node, node.getSourceFile()))
        .join('\n');
    return createSourceFile('bundle.d.ts', code, ScriptTarget.ESNext, true, ScriptKind.TS);
}