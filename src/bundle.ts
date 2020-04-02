import { isVariableDeclaration, Node, Symbol, createIdentifier, SyntaxKind, isExportSpecifier, createModifier, NodeFlags, isSourceFile, createSourceFile, ScriptTarget, ScriptKind, Statement, createPrinter, createModuleDeclaration, createModuleBlock, isImportTypeNode, createTypeReferenceNode, createImportDeclaration, createImportClause, createNamedImports, isImportDeclaration, isImportSpecifier, ImportDeclaration, createImportSpecifier, createStringLiteral, createExportDeclaration, createNamedExports, createExportSpecifier, isExportDeclaration, ImportSpecifier, ExportSpecifier } from 'typescript';
import { ReferencesMap, collect } from './collect';
import { removeModifier, addModifier, hasModifier, traverse } from './helpers/ast';

function createUniqueName(symbol: Symbol, collected: Map<string, Symbol>, suggested?: string) {
    let baseName = suggested || (symbol.getDeclarations()[0] as any).name.escapedText;
    while (collected.has(baseName) && collected.get(baseName) !== symbol) {
        let matchAlias = baseName.match(/_(\d+)$/);
        if (matchAlias) {
            baseName = baseName.replace(/_(\d+)$/, `_${parseInt(matchAlias[1]) + 1}`);
        } else {
            baseName += '_1';
        }
    }
    return baseName;
}

function renameSymbol(symbol: Symbol, references: ReferencesMap, collected: Map<string, Symbol>, name: string) {
    if (name !== symbol.getName()) {
        collected.set(name, symbol);
        (symbol as any)._escapedName = symbol.getName();
        (symbol.escapedName as string) = name;
        symbol.getDeclarations().forEach((declaration) => {
            (declaration as any).name = createIdentifier(name);
        });
        let refs = references.get(symbol) || [];
        refs.forEach((ref) => {
            (ref as any).escapedText = name;
        });
    }
}

function markExport(node: Node) {
    if (isExportDeclaration(node)) {
        return;
    }
    addModifier(node, SyntaxKind.ExportKeyword, true);
}

function sortStatements(node1: Statement, node2: Statement) {
    let isImport1 = isImportDeclaration(node1);
    let isImport2 = isImportDeclaration(node2);
    if (isImport1 && isImport2) {
        let source1 = ((node1 as ImportDeclaration).moduleSpecifier as any).text;
        let source2 = ((node2 as ImportDeclaration).moduleSpecifier as any).text;
        if (source1 < source2) {
            return -1;
        }
        if (source1 > source2) {
            return 1;
        }
        return 0;
    }
    if (isImport1) {
        return -1;
    }
    if (isImport2) {
        return 1;
    }
    return 0;
}

/**
 * Create a bundled definition file for a module.
 * @param fileName The module entry file.
 * @return The generated source file with all exported symbols.
 * 
 * @example
 * ```ts
 * import { createPrinter } from 'typescript';
 * import { bundle } from 'dts-apigen';
 * 
 * const sourceFile = bundle('src/index.ts');
 * const code = createPrinter().printFile(resultFile);
 * console.log(code);
 * ```
 * @see {@link collect} It uses the `collect` method to collect all required symbols.
 */
export function bundle(fileName: string) {
    const { typechecker, symbols, references, exported, external, files } = collect(fileName);
    const collected: Map<string, Symbol> = new Map();
    const imported: Map<Symbol, string> = new Map();
    const importSpecifiers: { [key: string]: ImportSpecifier[] } = {};
    const exportSpecifiers: ExportSpecifier[] = [];
    const nodes: Array<[Node, Symbol]> = symbols
        .reduce((list: Array<[Node, Symbol]>, symbol) => {
            const sourceFile = symbol.getDeclarations()[0].getSourceFile();
            if (!(sourceFile.fileName in files)) {
                const moduleSpecifier = external[sourceFile.fileName];
                if (!moduleSpecifier) {
                    // typings module
                    return list;
                }

                // dependency
                const name = createUniqueName(symbol, collected, symbol.getName());
                imported.set(symbol, name);
                renameSymbol(symbol, references, collected, name);
                importSpecifiers[moduleSpecifier.name] = importSpecifiers[moduleSpecifier.name] || [];
                const node = createImportSpecifier(symbol.getName() !== name ? createIdentifier(symbol.getName()) : undefined, createIdentifier(name));
                const exportAs = name === symbol.getName() ? undefined : symbol.getName();
                if (exported.indexOf(symbol) !== -1) {
                    exportSpecifiers.push(
                        createExportSpecifier(exportAs && name, exportAs || name)
                    );
                }
                importSpecifiers[moduleSpecifier.name].push(node);
                return list;
            }

            symbol.getDeclarations()
                .forEach((declaration) => {
                    let node: Node = declaration;
                    if (isVariableDeclaration(declaration)) {
                        node = declaration.parent.parent;
                    } else if (isImportSpecifier(node)) {
                        const alias = typechecker.getAliasedSymbol(symbol);
                        if (imported.has(alias)) {
                            renameSymbol(symbol, references, collected, imported.get(alias));
                            return;
                        }
                        const name = createUniqueName(alias, collected, alias.getName());
                        imported.set(alias, name);
                        renameSymbol(symbol, references, collected, name);
                        let importDecl = node.parent.parent.parent;
                        node = createImportDeclaration([], [], createImportClause(undefined, createNamedImports([
                            createImportSpecifier(alias.getName() !== name ? createIdentifier(alias.getName()) : undefined, createIdentifier(name))
                        ])), importDecl.moduleSpecifier);
                        node.parent = importDecl.parent;
                        symbol = alias;
                    }
                    removeModifier(node, SyntaxKind.DefaultKeyword);
                    removeModifier(node, SyntaxKind.ExportKeyword);
                    list.push([node, symbol]);
                });
            return list;
        }, []);
    
    for (let moduleName in importSpecifiers) {
        const node = createImportDeclaration([], [], createImportClause(undefined, createNamedImports(importSpecifiers[moduleName])), createStringLiteral(moduleName));
        nodes.push([node, undefined]);
    }

    if (exportSpecifiers.length) {
        nodes.unshift([
            createExportDeclaration([], [], createNamedExports(exportSpecifiers)),
            undefined,
        ]);
    }

    exported.forEach((sym) => {
        let refs = nodes.filter(([node, symbol]) => symbol === sym);
        if (refs.length) {
            refs.forEach(([node, symbol]) => markExport(node));
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
        nodes
            .filter(([node, symbol]) => symbol === alias)
            .forEach(([node]) => markExport(node));
        let name = createUniqueName(sym, collected);
        renameSymbol(alias, references, collected,name);
        collected.set(sym.getName(), alias);
    });
    const printer = createPrinter();
    const code = nodes
        .map(([node, symbol]) => {
            if (symbol) {
                let symbolName = symbol.getName();
                if (symbolName === 'default') {
                    let declaration = symbol.getDeclarations()[0];
                    let name = createUniqueName(symbol, collected, (declaration as any).name ? (declaration as any).name.getText() : '__default');
                    renameSymbol(symbol, references, collected, name);
                } else if (collected.get(symbolName) !== symbol) {
                    if (collected.has(symbolName)) {
                        renameSymbol(symbol, references, collected, createUniqueName(symbol, collected));
                    } else {
                        collected.set(symbolName, symbol);
                    }
                }
            }
            if (!hasModifier(node, SyntaxKind.DeclareKeyword) && !isImportDeclaration(node)) {
                addModifier(node, SyntaxKind.DeclareKeyword);
            }
            traverse(node, (child) => {
                if (isImportTypeNode(child)) {
                    let sourceSymbol = typechecker.getSymbolAtLocation(child);
                    if (!sourceSymbol) {
                        return;
                    }
                    let typeSymbol = sourceSymbol.exports.get(child.qualifier.getText() as any);
                    if (!typeSymbol) {
                        return;
                    }
                    for (let key in child) {
                        delete child[key];
                    }
                    Object.assign(child, createTypeReferenceNode(typeSymbol.getName(), []));
                }
            });
            return node as Statement;
        })
        .sort(sortStatements)
        .map((node) => printer.printNode(4, node, node.getSourceFile()))
        .join('\n');

    return createSourceFile('bundle.d.ts', code, ScriptTarget.ESNext, true, ScriptKind.TS);
}