import { createProgram, Symbol, TypeChecker, isFunctionDeclaration, SyntaxKind, isExportSpecifier, Signature, Type, isTypeParameterDeclaration, isParameter, isClassDeclaration, isInterfaceDeclaration, isModuleDeclaration, isTypeAliasDeclaration, isVariableDeclaration, ScriptTarget, isSourceFile, isFunctionTypeNode, isVariableStatement, Node, isExpressionWithTypeArguments, isConstructorTypeNode, isMethodSignature, isMethodDeclaration, isConstructorDeclaration, isPropertyDeclaration, isPropertySignature, isConstructSignatureDeclaration, isCallSignatureDeclaration, isIndexSignatureDeclaration, isTypeLiteralNode, isUnionTypeNode, isTypeReferenceNode, TypeNode, isLiteralTypeNode, NodeFlags, TypeFlags, isArrayTypeNode, isIdentifier, Identifier, isIntersectionTypeNode, isParenthesizedTypeNode, isTupleTypeNode, isMappedTypeNode, isThisTypeNode, isIndexedAccessTypeNode, isTypeOperatorNode } from 'typescript';

export type ReferencesMap = Map<Symbol, Identifier[]>;

function addReference(references: ReferencesMap, symbol: Symbol, type: Identifier) {
    let list = references.get(symbol) || [];
    list.push(type);
    references.set(symbol, list);
}

// function collectTypeReferences(typechecker: TypeChecker, symbols: Symbol[], references: ReferencesMap, type: Type) {
//     if (type.isUnionOrIntersection()) {
//         type.types.forEach((childType) => collectTypeReferences(typechecker, symbols, references, childType));
//     } else {
//         let symbol = (type as any).aliasSymbol || (type as any).symbol;
//         if (!symbol) {
//             return;
//         }
//         if (symbol.getName() === 'Url') {
//             // console.log(type);
//             // console.log(type.getBaseTypes())
//         }
//         addReference(references, symbol, type);
//         collectSymbol(typechecker, symbols, references, symbol);
//     }
// }

function collectNodeReferences(typechecker: TypeChecker, symbols: Symbol[], references: ReferencesMap, node: Node) {
    if (isFunctionDeclaration(node) ||
        isFunctionTypeNode(node) ||
        isConstructorTypeNode(node) ||
        isConstructorDeclaration(node) ||
        isConstructSignatureDeclaration(node) ||
        isMethodSignature(node) ||
        isMethodDeclaration(node) ||
        isCallSignatureDeclaration(node)) {
        if (node.typeParameters) {
            node.typeParameters.forEach((typeParam) => {
                collectNodeReferences(typechecker, symbols, references, typeParam);
            });
        }
        if (node.parameters) {
            node.parameters.forEach((parameter) => {
                collectNodeReferences(typechecker, symbols, references, parameter);
            });
        }
        if (node.type) {
            collectNodeReferences(typechecker, symbols, references, node.type);
        }
    } else if (isParameter(node) ||
        isVariableDeclaration(node) ||
        isPropertyDeclaration(node) ||
        isPropertySignature(node)) {
        if (node.type) {
            collectNodeReferences(typechecker, symbols, references, node.type);
        }
    } else if (isVariableStatement(node)) {
        node.declarationList.declarations.forEach((child) => {
            collectNodeReferences(typechecker, symbols, references, child);
        });
    } else if (isClassDeclaration(node) ||
        isInterfaceDeclaration(node)) {
        if (node.typeParameters) {
            node.typeParameters.forEach((typeParam) => {
                collectNodeReferences(typechecker, symbols, references, typeParam);
            });
        }
        if (node.heritageClauses) {
            node.heritageClauses.forEach((clause) => {
                clause.types.forEach((type) => {
                    collectNodeReferences(typechecker, symbols, references, type);
                });
            });
        }
        if (node.members) {
            (node.members as any).forEach((member) => {
                collectNodeReferences(typechecker, symbols, references, member);
            });
        }
    } else if (isModuleDeclaration(node)) {
        node.body.forEachChild((child) => {
            collectNodeReferences(typechecker, symbols, references, child);
        });
    } else if (isIndexSignatureDeclaration(node)) {
        if (node.typeParameters) {
            node.typeParameters.forEach((typeParam) => {
                collectNodeReferences(typechecker, symbols, references, typeParam);
            });
        }
        if (node.parameters) {
            node.parameters.forEach((parameter) => {
                collectNodeReferences(typechecker, symbols, references, parameter);
            });
        }
        if (node.type) {
            collectNodeReferences(typechecker, symbols, references, node.type);
        }
    } else if (isTypeLiteralNode(node)) {
        if (node.members) {
            (node.members as any).forEach((member) => {
                collectNodeReferences(typechecker, symbols, references, member);
            });
        }
    } else if (isExpressionWithTypeArguments(node) || isTypeParameterDeclaration(node)) {
        if (node.expression) {
            collectNodeReferences(typechecker, symbols, references, node.expression);
        }
    } else if (isUnionTypeNode(node) || isIntersectionTypeNode(node)) {
        node.types.forEach((type) => collectNodeReferences(typechecker, symbols, references, type));
    } else if (isParenthesizedTypeNode(node) || isTypeOperatorNode(node)) {
        if (node.type) {
            collectNodeReferences(typechecker, symbols, references, node.type);
        }
    } else if (isTupleTypeNode(node)) {
        node.elementTypes.forEach((type) => collectNodeReferences(typechecker, symbols, references, type));
    } else if (isMappedTypeNode(node)) {
        if (node.typeParameter) {
            collectNodeReferences(typechecker, symbols, references, node.typeParameter);
        }
        if (node.type) {
            collectNodeReferences(typechecker, symbols, references, node.type);
        }
    } else if (isTypeAliasDeclaration(node)) {
        if (node.typeParameters) {
            node.typeParameters.forEach((typeParam) => {
                collectNodeReferences(typechecker, symbols, references, typeParam);
            });
        }
        if (node.type) {
            collectNodeReferences(typechecker, symbols, references, node.type);
        }
    } else if (isTypeReferenceNode(node)) {
        if (node.typeArguments) {
            node.typeArguments.forEach((type) => collectNodeReferences(typechecker, symbols, references, type));
        }
        if (node.typeName) {
            collectNodeReferences(typechecker, symbols, references, node.typeName);
        }
    } else if (isArrayTypeNode(node)) {
        if (node.elementType) {
            collectNodeReferences(typechecker, symbols, references, node.elementType);
        }
    } else if (isIndexedAccessTypeNode(node)) {
        if (node.objectType) {
            collectNodeReferences(typechecker, symbols, references, node.objectType);
        }
    } else if (isIdentifier(node)) {
        let symbol = typechecker.getSymbolAtLocation(node);
        if (symbol) {
            addReference(references, symbol, node);
            collectSymbol(typechecker, symbols, references, symbol);
        }
    } else {
        // console.log(SyntaxKind[node.kind], node);
    }
}

function collectSymbol(typechecker: TypeChecker, symbols: Symbol[], references: ReferencesMap, symbol: Symbol) {
    if (symbols.indexOf(symbol) !== -1) {
        // already collected
        return;
    }
    if (!symbol.getDeclarations()) {
        return;
    }
    const firstDeclaration = symbol.getDeclarations()[0];
    if (isExportSpecifier(firstDeclaration)) {
        collectSymbol(typechecker, symbols, references, typechecker.getAliasedSymbol(symbol));
    } else if (isSourceFile(firstDeclaration)) {
        let exported = typechecker.getExportsOfModule(symbol);
        exported.forEach((exportedSymbol) => {
            collectSymbol(typechecker, symbols, references, exportedSymbol);
        });
    } else if (isFunctionTypeNode(firstDeclaration) || isConstructorTypeNode(firstDeclaration)) {
        symbol.declarations.forEach((declaration) => collectNodeReferences(typechecker, symbols, references, declaration));
    } else {
        symbols.push(symbol);
        symbol.declarations.forEach((declaration) => collectNodeReferences(typechecker, symbols, references, declaration));
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
    const exports = typechecker.getExportsOfModule(typechecker.getSymbolAtLocation(main));
    exports.forEach((symbol) => collectSymbol(typechecker, symbols, references, symbol));
    return {
        sources,
        symbols,
        references,
        exports,
        typechecker,
    };
}