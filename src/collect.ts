import { createProgram, Symbol, TypeChecker, isFunctionDeclaration, SyntaxKind, isExportSpecifier, Signature, Type, Declaration, isTypeParameterDeclaration, isParameter, isClassDeclaration, isInterfaceDeclaration, isModuleDeclaration, isTypeAliasDeclaration, isVariableDeclaration, ScriptTarget, createPrinter, EmitHint, isSourceFile, isFunctionTypeNode } from 'typescript';

export type ReferencesMap = Map<Symbol, Symbol[]>;

function addReference(references: ReferencesMap, left: Symbol, right: Symbol) {
    let list = references.get(left) || [];
    list.push(right);
    references.set(left, list);
}

function collectTypeReferences(typechecker: TypeChecker, symbols: Symbol[], references: ReferencesMap, type: Type, parentSymbol: Symbol) {
    if (type.isUnion()) {
        type.types.forEach((childType) => collectTypeReferences(typechecker, symbols, references, childType, parentSymbol));
    } else {
        let symbol = (type as any).aliasSymbol || (type as any).symbol;
        if (!symbol) {
            return;
        }
        addReference(references, parentSymbol, symbol);
        collectSymbol(typechecker, symbols, references, symbol);
    }
}

function collectDeclarationReferences(typechecker: TypeChecker, symbols: Symbol[], references: ReferencesMap, declaration: Declaration, parentSymbol: Symbol) {
    if (isFunctionDeclaration(declaration) || isFunctionTypeNode(declaration)) {
        if (declaration.typeParameters) {
            declaration.typeParameters.forEach((typeParam) => {
                collectDeclarationReferences(typechecker, symbols, references, typeParam, parentSymbol);
            });
        }
        if (declaration.parameters) {
            declaration.parameters.forEach((parameter) => {
                collectDeclarationReferences(typechecker, symbols, references, parameter, parentSymbol);
            });
        }
        let signature: Signature = typechecker.getSignatureFromDeclaration(declaration);
        let returnType = typechecker.getReturnTypeOfSignature(signature);
        collectTypeReferences(typechecker, symbols, references, returnType, parentSymbol);
    } else if (isParameter(declaration) || isTypeParameterDeclaration(declaration) || isTypeAliasDeclaration(declaration)) {
        let type = typechecker.getTypeAtLocation(declaration);
        collectTypeReferences(typechecker, symbols, references, type, parentSymbol);
    } else if (isVariableDeclaration(declaration)) {
        let type = typechecker.getTypeAtLocation(declaration.type);
        collectTypeReferences(typechecker, symbols, references, type, parentSymbol);
    } else if (isClassDeclaration(declaration) || isInterfaceDeclaration(declaration)) {
        if (declaration.typeParameters) {
            declaration.typeParameters.forEach((typeParam) => {
                collectDeclarationReferences(typechecker, symbols, references, typeParam, parentSymbol);
            });
        }
        if (declaration.heritageClauses) {
            declaration.heritageClauses.forEach((clause) => {
                let type = typechecker.getTypeAtLocation(clause);
                collectTypeReferences(typechecker, symbols, references, type, parentSymbol);
            });
        }
        if (declaration.members) {
            (declaration.members as any).forEach((member) => {
                let symbol = typechecker.getSymbolAtLocation((member as any).symbol);
                if (!symbol) {
                    return;
                }
                symbol.getDeclarations().forEach((memberDeclaration) => {
                    collectDeclarationReferences(typechecker, symbols, references, memberDeclaration, parentSymbol);
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
                collectDeclarationReferences(typechecker, symbols, references, memberDeclaration, parentSymbol);
            });
        });
    } else {
        console.log(SyntaxKind[declaration.kind]);
    }
}

function collectSymbol(typechecker: TypeChecker, symbols: Symbol[], references: ReferencesMap, symbol: Symbol) {
    if (symbols.indexOf(symbol) !== -1) {
        // already collected
        return;
    }
    if (isExportSpecifier(symbol.getDeclarations()[0])) {
        collectSymbol(typechecker, symbols, references, typechecker.getAliasedSymbol(symbol));
    } else if (isSourceFile(symbol.getDeclarations()[0])) {
        let exported = typechecker.getExportsOfModule(symbol);
        exported.forEach((exportedSymbol) => {
            collectSymbol(typechecker, symbols, references, exportedSymbol);
        });
    } else {
        symbols.push(symbol);
        symbol.declarations.forEach((declaration) => collectDeclarationReferences(typechecker, symbols, references, declaration, symbol));
    }
}

export function collect(fileNames: string[]) {
    const program = createProgram(fileNames, {
        target: ScriptTarget.ESNext,
        declaration: true,
    });
    const typechecker = program.getTypeChecker();
    const sources = program.getSourceFiles();
    const main = sources[sources.length - 1];

    const symbols: Symbol[] = [];
    const references: ReferencesMap = new Map();
    typechecker.getExportsOfModule((main as any).symbol).forEach((symbol) => collectSymbol(typechecker, symbols, references, symbol));
    return {
        sources,
        symbols,
        references,
        typechecker,
    };
}