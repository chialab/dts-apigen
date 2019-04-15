import { createProgram, Symbol, TypeChecker, isFunctionDeclaration, SyntaxKind, isExportSpecifier, Signature, Type, Declaration, isTypeParameterDeclaration, isParameter, isClassDeclaration, isInterfaceDeclaration, isModuleDeclaration, isTypeAliasDeclaration, isVariableDeclaration, ScriptTarget, createPrinter, EmitHint, isSourceFile, isFunctionTypeNode } from 'typescript';

function collectTypeReferences(typechecker: TypeChecker, symbols: Symbol[], type: Type) {
    if (type.isUnion()) {
        type.types.forEach((childType) => collectTypeReferences(typechecker, symbols, childType));
    } else {
        let symbol = (type as any).aliasSymbol || (type as any).symbol;
        if (!symbol) {
            return;
        }
        collect(typechecker, symbols, symbol);
    }
}

function collectDeclarationReferences(typechecker: TypeChecker, symbols: Symbol[], declaration: Declaration) {
    if (isFunctionDeclaration(declaration) || isFunctionTypeNode(declaration)) {
        if (declaration.typeParameters) {
            declaration.typeParameters.forEach((typeParam) => {
                collectDeclarationReferences(typechecker, symbols, typeParam);
            });
        }
        if (declaration.parameters) {
            declaration.parameters.forEach((parameter) => {
                collectDeclarationReferences(typechecker, symbols, parameter);
            });
        }
        let signature: Signature = typechecker.getSignatureFromDeclaration(declaration);
        let returnType = typechecker.getReturnTypeOfSignature(signature);
        collectTypeReferences(typechecker, symbols, returnType);
    } else if (isParameter(declaration) || isTypeParameterDeclaration(declaration) || isTypeAliasDeclaration(declaration)) {
        let type = typechecker.getTypeAtLocation(declaration);
        collectTypeReferences(typechecker, symbols, type);
    } else if (isVariableDeclaration(declaration)) {
        let type = typechecker.getTypeAtLocation(declaration.type);
        collectTypeReferences(typechecker, symbols, type);
    } else if (isClassDeclaration(declaration) || isInterfaceDeclaration(declaration)) {
        if (declaration.typeParameters) {
            declaration.typeParameters.forEach((typeParam) => {
                collectDeclarationReferences(typechecker, symbols, typeParam);
            });
        }
        if (declaration.heritageClauses) {
            declaration.heritageClauses.forEach((clause) => {
                let type = typechecker.getTypeAtLocation(clause);
                collectTypeReferences(typechecker, symbols, type);
            });
        }
        if (declaration.members) {
            (declaration.members as any).forEach((member) => {
                let symbol = typechecker.getSymbolAtLocation((member as any).symbol);
                if (!symbol) {
                    return;
                }
                symbol.getDeclarations().forEach((memberDeclaration) => {
                    collectDeclarationReferences(typechecker, symbols, memberDeclaration);
                });
            });
        }
    } else if (isModuleDeclaration(declaration)) {
        declaration.body.forEachChild((child) => {
            let symbol = typechecker.getSymbolAtLocation((child as any).symbol);
            if (!symbol) {
                return;
            }
            symbol.getDeclarations().forEach((memberDeclaration) => {
                collectDeclarationReferences(typechecker, symbols, memberDeclaration);
            });
        });
    } else if (isSourceFile(declaration)) {
        let exported = typechecker.getExportsOfModule((declaration as any).symbol);
        exported.forEach((exportedSymbol) => {
            collect(typechecker, symbols, exportedSymbol);
        });
    } else {
        console.log(SyntaxKind[declaration.kind]);
    }
}

function collect(typechecker: TypeChecker, symbols: Symbol[], symbol: Symbol) {
    if (symbols.indexOf(symbol) !== -1) {
        // already collected
        return;
    }
    if (isExportSpecifier(symbol.getDeclarations()[0])) {
        collect(typechecker, symbols, typechecker.getAliasedSymbol(symbol));
    } else {
        symbols.push(symbol);
        symbol.declarations.forEach((declaration) => collectDeclarationReferences(typechecker, symbols, declaration));
    }
}

export function documentate(fileNames: string[]) {
    const program = createProgram(fileNames, {
        target: ScriptTarget.ESNext,
        declaration: true,
    });
    const typechecker = program.getTypeChecker();
    const sources = program.getSourceFiles();
    const mainSource = sources[sources.length - 1];

    const symbols: Symbol[] = [];
    typechecker.getExportsOfModule((mainSource as any).symbol).forEach((symbol) => collect(typechecker, symbols, symbol));
    const printer = createPrinter();
    const codeBlocks: string[] = [];
    symbols.forEach((symbol) => {
        let sourceFile = symbol.getDeclarations()[0].getSourceFile();
        if (sourceFile.fileName.indexOf('node_modules') === -1) {
            symbol.getDeclarations().forEach((declaration) => {
                codeBlocks.push(printer.printNode(
                    EmitHint.Unspecified,
                    declaration,
                    sourceFile
                ));
            })
        }
    });
    console.log(codeBlocks.join('\n\n'));
}