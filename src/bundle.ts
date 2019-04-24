import { isVariableDeclaration, Node, Symbol, createIdentifier, SyntaxKind, isExportSpecifier, createModifier, NodeFlags, isSourceFile, createSourceFile, ScriptTarget, ScriptKind, Statement, createPrinter, createModuleDeclaration, createModuleBlock, visitNode, isImportTypeNode, visitEachChild, visitNodes, createTypeReferenceNode } from 'typescript';
import { ReferencesMap, collect } from './collect';
import { removeModifier, addModifier, hasModifier } from './helpers/ast';

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
            const visit = (node) => {
                if (!node) {
                    return;
                }
                if (node.type && isImportTypeNode(node.type)) {
                    let sourceSymbol = typechecker.getSymbolAtLocation(node.type);
                    if (!sourceSymbol) {
                        return;
                    }
                    let typeSymbol = sourceSymbol.exports.get(node.type.qualifier.getText())
                    if (!typeSymbol) {
                        return;
                    }
                    node.type = createTypeReferenceNode(typeSymbol.getName(), []);
                }
                if (node.left) {
                    visitNode(node.left, visit);
                }
                if (node.tag) {
                    visitNode(node.tag, visit);
                }
                if (node.operand) {
                    visitNode(node.operand, visit);
                }
                if (node.condition) {
                    visitNode(node.condition, visit);
                }
                if (node.head) {
                    visitNode(node.head, visit);
                }
                if (node.type) {
                    visitNode(node.type, visit);
                }
                if (node.elementType) {
                    visitNode(node.elementType, visit);
                }
                if (node.objectType) {
                    visitNode(node.objectType, visit);
                }
                if (node.checkType) {
                    visitNode(node.checkType, visit);
                }
                if (node.typeParameter) {
                    visitNode(node.typeParameter, visit);
                }
                if (node.expression) {
                    visitNode(node.expression, visit);
                }
                if (node.argument) {
                    visitNode(node.argument, visit);
                }
                if (node.name) {
                    visitNode(node.name, visit);
                }
                if (node.typeName) {
                    visitNode(node.typeName, visit);
                }
                if (node.parameterName) {
                    visitNode(node.parameterName, visit);
                }
                if (node.propertyName) {
                    visitNode(node.propertyName, visit);
                }
                if (node.tagName) {
                    visitNode(node.tagName, visit);
                }
                if (node.exprName) {
                    visitNode(node.exprName, visit);
                }
                if (node.readonlyToken) {
                    visitNode(node.readonlyToken, visit);
                }
                if (node.dotDotDotToken) {
                    visitNode(node.dotDotDotToken, visit);
                }
                if (node.asteriskToken) {
                    visitNode(node.asteriskToken, visit);
                }
                if (node.initializer) {
                    visitNode(node.initializer, visit);
                }
                if (node.body) {
                    visitNode(node.body, visit);
                }
                if (node.tryBlock) {
                    visitNode(node.tryBlock, visit);
                }
                if (node.openingFragment) {
                    visitNode(node.openingFragment, visit);
                }
                if (node.variableDeclaration) {
                    visitNode(node.variableDeclaration, visit);
                }
                if (node.awaitModifier) {
                    visitNode(node.awaitModifier, visit);
                }
                if (node.label) {
                    visitNode(node.label, visit);
                }
                if (node.literal) {
                    visitNode(node.literal, visit);
                }
                if (node.types) {
                    visitNodes(node.types, visit);
                }
                if (node.typeArguments) {
                    visitNodes(node.typeArguments, visit);
                }
                if (node.typeParameters) {
                    visitNodes(node.typeParameters, visit);
                }
                if (node.elementTypes) {
                    visitNodes(node.elementTypes, visit);
                }
                if (node.declarationList) {
                    visitNode(node.declarationList, visit);
                }
                if (node.decorators) {
                    visitNodes(node.decorators, visit);
                }
                if (node.modifiers) {
                    visitNodes(node.modifiers, visit);
                }
                if (node.parameters) {
                    visitNodes(node.parameters, visit);
                }
                if (node.declarations) {
                    visitNodes(node.declarations, visit);
                }
                if (node.statements) {
                    visitNodes(node.statements, visit);
                }
                if (node.elements) {
                    visitNodes(node.elements, visit);
                }
                if (node.properties) {
                    visitNodes(node.properties, visit);
                }
                if (node.members) {
                    visitNodes(node.members, visit);
                }
                if (node.clauses) {
                    visitNodes(node.clauses, visit);
                }
                return node;
            };
            visitNode(node, visit);
            return node;
        })
        .map((node) => printer.printNode(4, node, node.getSourceFile()))
        .join('\n');
    return createSourceFile('bundle.d.ts', code, ScriptTarget.ESNext, true, ScriptKind.TS);
}