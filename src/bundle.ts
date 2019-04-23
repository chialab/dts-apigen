import { writeFileSync } from 'fs';
import { createPrinter, EmitHint, isVariableDeclaration, Node, Symbol, createIdentifier, SyntaxKind, isExportSpecifier, createVariableDeclaration, createVariableStatement, createModifier, createVariableDeclarationList, NodeFlags, createExportDeclaration, createNamedExports, createExportSpecifier, isSourceFile, createTypeLiteralNode, createPropertySignature, createTypeQueryNode, TypeChecker } from 'typescript';
import { ReferencesMap, collect } from './collect';
import { ensureFile, removeModifier, addModifier, hasModifier } from './helpers';

function renameSymbol(typechecker: TypeChecker, symbol: Symbol, references: ReferencesMap, collected: string[], suggested?: string) {
    let baseName = suggested || (symbol.getDeclarations()[0] as any).name.escapedText;
    while (collected.indexOf(baseName) !== -1) {
        let matchAlias = baseName.match(/_(\d+)$/);
        if (matchAlias) {
            baseName = baseName.replace(/_(\d+)$/, `_${parseInt(matchAlias[1]) + 1}`);
        } else {
            baseName += '_1';
        }
    }
    if (baseName !== symbol.getName()) {
        (symbol as any)._escapedName = symbol.getName();
        (symbol.escapedName as string) = baseName;
        symbol.getDeclarations().forEach((declaration) => {
            (declaration as any).name = createIdentifier(baseName);
        });
        let refs = references.get(symbol) || [];
        refs.forEach((ref) => {
            ref.escapedText = baseName;
            ref.parent = null;
        });
    }
}

function getOriginalSymbolName(symbol: Symbol) {
    if ((symbol as any)._escapedName) {
        return (symbol as any)._escapedName as string;
    }
    return symbol.getName();
}

export function bundle(fileNames: string[], output?: string) {
    const { typechecker, symbols, references, exported } = collect(fileNames);
    const printer = createPrinter();
    const blocks: string[] = [];
    const collected: string[] = exported
        .filter((symbol) => {
            if (symbols.includes(symbol)) {
                return false;
            }
            let alias = typechecker.getAliasedSymbol(symbol);
            if (!alias) {
                return false;
            }
            let aliasDeclaration = alias.getDeclarations()[0];
            return isSourceFile(aliasDeclaration);
        })
        .map((symbol) => symbol.getName());
    symbols.forEach((symbol) => {
        const sourceFile = symbol.getDeclarations()[0].getSourceFile();
        if (sourceFile.fileName.indexOf('node_modules') === -1) {
            let symbolName = symbol.getName();
            if (symbolName === 'default') {
                let declaration = symbol.getDeclarations()[0];
                if ((declaration as any).name) {
                    renameSymbol(typechecker, symbol, references, collected, (declaration as any).name.getText());
                } else {
                    renameSymbol(typechecker, symbol, references, collected, '__default');
                }
            } else if (collected.indexOf(symbolName) !== -1) {
                renameSymbol(typechecker, symbol, references, collected);
            } else {
                collected.push(symbolName);
            }
            symbol.getDeclarations()
                .map((declaration) => {
                    let node: Node = declaration;
                    if (isVariableDeclaration(declaration)) {
                        node = declaration.parent.parent;
                    }
                    removeModifier(node, SyntaxKind.DefaultKeyword);
                    removeModifier(node, SyntaxKind.ExportKeyword);
                    if (!hasModifier(node, SyntaxKind.DeclareKeyword)) {
                        addModifier(node, SyntaxKind.DeclareKeyword);
                    }
                    return node;
                })
                .forEach((node) => {
                    blocks.push(printer.printNode(
                        EmitHint.Unspecified,
                        node,
                        sourceFile
                    ));
                });
        }
    });
    exported.forEach((symbol) => {
        const sourceFile = symbol.getDeclarations()[0].getSourceFile();
        const name = symbol.getName();
        let node: Node;
        let declaration = symbol.getDeclarations()[0];
        if (symbols.includes(symbol)) {
            let declarationName = (declaration as any).name.getText();
            node = createExportDeclaration([], [], createNamedExports([
                createExportSpecifier(name !== declarationName ? name : undefined, declarationName),
            ]));
        } else if (isExportSpecifier(declaration)) {
            let alias = typechecker.getAliasedSymbol(symbol);
            if (!alias) {
                return;
            }
            let aliasDeclaration = alias.getDeclarations()[0];
            if (isSourceFile(aliasDeclaration)) {
                let aliasExports = typechecker.getExportsOfModule(alias);
                node = createVariableStatement([createModifier(SyntaxKind.ExportKeyword), createModifier(SyntaxKind.DeclareKeyword)], createVariableDeclarationList([
                    createVariableDeclaration(name, createTypeLiteralNode(
                        aliasExports.map((aliasExport) => createPropertySignature([], getOriginalSymbolName(aliasExport), undefined, createTypeQueryNode((aliasExport.getDeclarations()[0] as any).name), undefined))
                    ), undefined)
                ], NodeFlags.Const));
            } else {
                let aliasName = (aliasDeclaration as any).name.escapedText;
                node = createExportDeclaration([], [], createNamedExports([
                    createExportSpecifier(name !== aliasName ? name : undefined, aliasName),
                ]));
            }
        }
        if (!node) {
            return;
        }
        blocks.push(printer.printNode(
            EmitHint.Unspecified,
            node,
            sourceFile
        ));
    });
    const code = blocks.join('\n\n');
    if (output) {
        ensureFile(output);
        writeFileSync(output, code);
    }
    return code;
}