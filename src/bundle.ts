import { writeFileSync } from 'fs';
import { createPrinter, EmitHint, isVariableDeclaration, Node, Symbol, createIdentifier, SyntaxKind } from 'typescript';
import { ReferencesMap, collect } from './collect';
import { ensureFile, removeModifier } from './helpers';

function renameSymbol(symbol: Symbol, references: ReferencesMap, collected: string[], suggested?: string) {
    let baseName = suggested || symbol.getName();
    while (collected.indexOf(baseName) !== -1) {
        let matchAlias = baseName.match(/_(\d+)$/);
        if (matchAlias) {
            baseName = baseName.replace(/_(\d+)$/, `_${parseInt(matchAlias[1]) + 1}`);
        } else {
            baseName += '_1';
        }
    }
    (symbol.escapedName as string) = baseName;
    symbol.getDeclarations().forEach((declaration) => {
        (declaration as any).name = createIdentifier(baseName);
    });
}

export function bundle(fileNames: string[], output?: string) {
    const { typechecker, symbols, references } = collect(fileNames);
    const printer = createPrinter();
    const codeBlocks: string[] = [];
    const collectedNames: string[] = [];
    symbols.forEach((symbol) => {
        let sourceFile = symbol.getDeclarations()[0].getSourceFile();
        if (sourceFile.fileName.indexOf('node_modules') === -1) {
            let symbolName = symbol.getName();
            if (symbolName === 'default') {
                let declaration = symbol.getDeclarations()[0];
                if ((declaration as any).name) {
                    renameSymbol(symbol, references, collectedNames, (declaration as any).name.getText());
                } else {
                    renameSymbol(symbol, references, collectedNames, '__default');
                }
            } else if (collectedNames.indexOf(symbolName) !== -1) {
                renameSymbol(symbol, references, collectedNames);
            } else {
                collectedNames.push(symbolName);
            }
            symbol.getDeclarations().forEach((declaration) => {
                removeModifier(declaration, SyntaxKind.DefaultKeyword);
                removeModifier(declaration, SyntaxKind.ExportKeyword);

                let node: Node = declaration;
                if (isVariableDeclaration(declaration)) {
                    node = declaration.parent.parent;
                }
                codeBlocks.push(printer.printNode(
                    EmitHint.Unspecified,
                    node,
                    sourceFile
                ));
            })
        }
    });
    const code = codeBlocks.join('\n\n');
    if (output) {
        ensureFile(output);
        writeFileSync(output, code);
    }
    return code;
}