import { isVariableDeclaration, Node, Symbol, createIdentifier, SyntaxKind, isExportSpecifier, createModifier, NodeFlags, isSourceFile, createSourceFile, ScriptTarget, ScriptKind, Statement, createPrinter, createModuleDeclaration, createModuleBlock, isImportTypeNode, createTypeReferenceNode, createImportDeclaration, createImportClause, createNamedImports, isImportDeclaration, isImportSpecifier, ImportDeclaration, createImportSpecifier, createStringLiteral, createExportDeclaration, createNamedExports, createExportSpecifier, ExportSpecifier, isTypeParameterDeclaration, TypeChecker, isModuleBlock } from 'typescript';
import { collect } from './collect';
import { removeModifier, traverse, addModifier, getAliasedSymbol } from './helpers/ast';

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
    const externalImports: Map<string, ImportDeclaration> = new Map();
    const externalImported: Map<string, Symbol[]> = new Map();
    const imports: Node[] = [];
    const exportClause = createNamedExports([]);
    const exportDeclaration = createExportDeclaration([], [], exportClause);
    const nodes: Node[] = [];
    const printer = createPrinter();
        
    function createUniqueName(symbol: Symbol, suggested?: string) {
        let originalName = symbol.getName();
        let alias = getAliasedSymbol(typechecker, symbol) || symbol;
        let baseName = suggested || originalName;
        while (collected.has(baseName) && collected.get(baseName) !== alias) {
            let matchAlias = baseName.match(/_(\d+)$/);
            if (matchAlias) {
                baseName = baseName.replace(/_(\d+)$/, `_${parseInt(matchAlias[1]) + 1}`);
            } else {
                baseName += '_1';
            }
        }
        collected.set(baseName, alias);
        if (originalName !== baseName) {
            renameSymbol(alias, baseName);
            renameSymbol(symbol, baseName);
        }
        return baseName;
    }
    
    function renameSymbol(symbol: Symbol, name: string) {
        let refs = references.get(symbol) || [];
        let id = createIdentifier(name);
        refs.forEach((ref) => {
            for (let key in ref) {
                delete ref[key];
            }
            Object.assign(ref, id);
        });
    }

    function addExternalImport(symbol: Symbol, specifier: string, importedName: string, localName: string = importedName) {
        const list = externalImported.get(specifier) || [];
        const alias = getAliasedSymbol(typechecker, symbol) || symbol;
        if (list.includes(alias)) {
            return;
        }
        let importDeclaration = externalImports.get(specifier);
        if (!importDeclaration) {
            importDeclaration = createImportDeclaration([], [], createImportClause(undefined, createNamedImports([])), createStringLiteral(specifier));
            externalImports.set(specifier, importDeclaration);
            imports.push(importDeclaration);
        }
        if (localName !== importedName) {
            (importDeclaration.importClause.namedBindings as any).elements.push(
                createImportSpecifier(createIdentifier(importedName), createIdentifier(localName))
            );
        } else {
            (importDeclaration.importClause.namedBindings as any).elements.push(
                createImportSpecifier(undefined, createIdentifier(importedName))
            );
        }

        list.push(alias);
        externalImported.set(specifier, list);
    }

    function buildStatement(declaration: Node, shouldDeclare:boolean = true) {
        if (isVariableDeclaration(declaration)) {
            declaration = declaration.parent.parent;
        }
        if (isTypeParameterDeclaration(declaration)) {
            // ignore
            return;
        }
        if (isExportSpecifier(declaration)) {
            return createExportDeclaration([], [], createNamedExports([declaration]));
        }

        removeModifier(declaration, SyntaxKind.DefaultKeyword);
        removeModifier(declaration, SyntaxKind.DeclareKeyword);
        if (shouldDeclare) {
            removeModifier(declaration, SyntaxKind.ExportKeyword);
            addModifier(declaration, SyntaxKind.DeclareKeyword);
        }
        traverse(declaration, (child) => {
            if (isImportTypeNode(child)) {
                let sourceSymbol = typechecker.getSymbolAtLocation(child);
                if (!sourceSymbol) {
                    return;
                }
                let typeSymbol = sourceSymbol.exports.get(child.qualifier.getText() as any);
                if (!typeSymbol) {
                    return;
                }
                const args = child.typeArguments;
                for (let key in child) {
                    delete child[key];
                }
                Object.assign(child, createTypeReferenceNode(typeSymbol.getName(), args));
            }
        });

        return declaration;
    }

    const notTypeParamSymbols = symbols
        .filter((symbol) => {
            const declarations = symbol.getDeclarations() || [];
            return !declarations.some((declaration) => isTypeParameterDeclaration(declaration));
        });

    const sourceModuleSymbols = notTypeParamSymbols
        .filter((symbol) => {
            const alias = getAliasedSymbol(typechecker, symbol) || symbol;
            const declarations = alias.getDeclarations() || [];
            return !declarations.some((declaration) => {
                let sourceFile = declaration.getSourceFile();
                return !(sourceFile.fileName in files);
            });
        });
    
    // external modules
    const externalSymbols = notTypeParamSymbols
        .filter((symbol) => {
            const alias = getAliasedSymbol(typechecker, symbol) || symbol;
            const declarations = alias.getDeclarations() || [];
            return !declarations.some((declaration) => {
                let sourceFile = declaration.getSourceFile();
                return !(sourceFile.fileName in external);
            });
        })

    externalSymbols.map((symbol) => {
        const declarations = symbol.getDeclarations() || [];
        return [
            symbol,
            declarations.filter((declaration) => {
                let sourceFile = declaration.getSourceFile();
                return !(sourceFile.fileName in files) && sourceFile.fileName in external;
            }),
        ] as [Symbol, Node[]];
    }).forEach(([symbol, declarations]) => {
        if (!declarations.length) {
            return;
        }

        let name = createUniqueName(symbol);
        declarations.forEach((declaration) => {
            let sourceFile = declaration.getSourceFile();
            let packageId = external[sourceFile.fileName];
            let specifier = packageId.name;
            if (packageId.subModuleName) {
                specifier += `/${packageId.subModuleName.replace(/\.d\.ts$/, '')}`;
            }
            addExternalImport(symbol, specifier, symbol.getName(), name);
        });
    });

    // internal modules
    sourceModuleSymbols
        .map((symbol) => {
            const declarations = symbol.getDeclarations() || [];
            return [
                symbol,
                declarations.filter((declaration) => isImportSpecifier(declaration) || isExportSpecifier(declaration)),
            ] as [Symbol, Node[]];
        })
        .forEach(([symbol, declarations]) => {
            if (!declarations.length) {
                return;
            }
            let alias = getAliasedSymbol(typechecker, symbol) || symbol;
            let name = createUniqueName(symbol);

            declarations.forEach((declaration) => {
                if (isImportSpecifier(declaration)) {
                    let oldImportDeclaration = declaration.parent.parent.parent;
                    let specifier = oldImportDeclaration.moduleSpecifier.getText().replace(/['"]/g, '');
                    if (alias !== symbol) {
                        addExternalImport(symbol, specifier, alias.getName(), name);
                    }
                } else if (isExportSpecifier(declaration)) {
                    let oldExportDeclaration = declaration.parent.parent;
                    if (oldExportDeclaration.moduleSpecifier) {
                        let specifier = oldExportDeclaration.moduleSpecifier.getText().replace(/['"]/g, '');
                        addExternalImport(symbol, specifier, symbol.getName(), name);
                    }
                    (exportClause.elements as unknown as ExportSpecifier[]).push(declaration);
                    return;
                }
            });
        });

    exported
        .filter((symbol) => {
            const alias = getAliasedSymbol(typechecker, symbol) || symbol;
            const declarations = alias.getDeclarations() || [];
            return !declarations.some((declaration) => {
                let sourceFile = declaration.getSourceFile();
                return !(sourceFile.fileName in external);
            });
        })
        .map((symbol) => {
            const declarations = symbol.getDeclarations() || [];
            return [
                symbol,
                declarations.filter((declaration) => isExportSpecifier(declaration)),
            ] as [Symbol, ExportSpecifier[]];
        })
        .forEach(([symbol, declarations]) => {
            let name = createUniqueName(symbol);
            declarations.forEach((declaration) => {
                let exportDeclaration = declaration.parent.parent;
                if (exportDeclaration.moduleSpecifier) {
                    let specifier = exportDeclaration.moduleSpecifier.getText().replace(/['"]/g, '');
                    addExternalImport(symbol, specifier, symbol.getName(), name);
                }
                let specifier: ExportSpecifier;
                if (declaration.propertyName && !exportDeclaration.moduleSpecifier && !externalSymbols.includes(symbol)) {
                    let alias = typechecker.getSymbolAtLocation(declaration.propertyName);
                    let aliasName = createUniqueName(alias);
                    specifier = createExportSpecifier(createIdentifier(aliasName), createIdentifier(symbol.getName()));
                } else if (symbol.getName() !== name) {
                    specifier = createExportSpecifier(createIdentifier(name), createIdentifier(symbol.getName()));
                } else {
                    specifier = createExportSpecifier(undefined, createIdentifier(name));
                }
                (exportClause.elements as unknown as ExportSpecifier[]).push(specifier);
            });
        });

    exported
        .filter((symbol) => {
            const alias = getAliasedSymbol(typechecker, symbol) || symbol;
            const declarations = alias.getDeclarations() || [];
            return !declarations.some((declaration) => {
                let sourceFile = declaration.getSourceFile();
                return !(sourceFile.fileName in files);
            });
        })
        .forEach((symbol) => {
            const alias = getAliasedSymbol(typechecker, symbol) || symbol;
            let name = createUniqueName(symbol);
            const declarations = symbol.getDeclarations() || [];
            declarations.forEach((declaration) => {
                let specifier: ExportSpecifier;
                if (isExportSpecifier(declaration)) {
                    specifier = declaration;
                    if (alias !== symbol) {
                        const aliasDeclaration = alias.getDeclarations()[0];
                        if (isSourceFile(aliasDeclaration)) {
                            let statements = aliasDeclaration.statements
                                .filter((node) => !isImportDeclaration(node));
                            let node = createModuleDeclaration([], [
                                createModifier(SyntaxKind.DeclareKeyword)],
                                createIdentifier(name),
                                createModuleBlock(statements.map((node) => buildStatement(node, false)) as Statement[]),
                                NodeFlags.Namespace
                            );
                            nodes.push(node);
                        } else if (alias.getName() !== name && alias.getName() !== 'default') {
                            specifier = createExportSpecifier(createIdentifier(alias.getName()), createIdentifier(name));
                        } else {
                            specifier = createExportSpecifier(undefined, createIdentifier(name));
                        }
                    }
                } else if (symbol.getName() !== name) {
                    specifier = createExportSpecifier(createIdentifier(symbol.getName()), createIdentifier(name));
                } else {
                    specifier = createExportSpecifier(undefined, createIdentifier(name));
                }
                (exportClause.elements as unknown as ExportSpecifier[]).push(specifier);
            });
        });
    
    // statements
    sourceModuleSymbols
        .map((symbol) => {
            const declarations = symbol.getDeclarations() || [];
            return [
                symbol,
                declarations.filter((declaration) => !isImportSpecifier(declaration) && !isExportSpecifier(declaration)),
            ] as [Symbol, Node[]];
        })
        .forEach(([symbol, declarations]) => {
            if (!declarations.length) {
                return;
            }
            createUniqueName(symbol);
            declarations.forEach((declaration: Node) => {
                nodes.push(buildStatement(declaration));
            });
        });

    const exports = exportClause.elements.length ? [exportDeclaration] : []; 
    const code = imports
        .concat(nodes)
        .concat(exports)
        .map((node) => printer.printNode(4, node, node.getSourceFile()))
        .join('\n');

    return createSourceFile('bundle.d.ts', code, ScriptTarget.ESNext, true, ScriptKind.TS);
}