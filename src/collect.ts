import { resolve, dirname } from 'path';
import { createCompilerHost as tsCreateCompilerHost, createProgram as tsCreateProgram, Symbol, TypeChecker, isFunctionDeclaration, isExportSpecifier, isTypeParameterDeclaration, isParameter, isClassDeclaration, isInterfaceDeclaration, isModuleDeclaration, isTypeAliasDeclaration, isVariableDeclaration, ScriptTarget, isSourceFile, isFunctionTypeNode, isVariableStatement, Node, isExpressionWithTypeArguments, isConstructorTypeNode, isMethodSignature, isMethodDeclaration, isConstructorDeclaration, isPropertyDeclaration, isPropertySignature, isConstructSignatureDeclaration, isCallSignatureDeclaration, isIndexSignatureDeclaration, isTypeLiteralNode, isUnionTypeNode, isTypeReferenceNode, isArrayTypeNode, isIdentifier, Identifier, isIntersectionTypeNode, isParenthesizedTypeNode, isTupleTypeNode, isMappedTypeNode, isIndexedAccessTypeNode, isTypeOperatorNode, CompilerOptions, createSourceFile, ScriptKind, resolveModuleName, ResolvedModule, sys, SyntaxKind, isExportAssignment } from 'typescript';
import { createProgram } from './Program';

export type ReferencesMap = Map<Symbol, Identifier[]>;

function addReference(references: ReferencesMap, symbol: Symbol, type: Identifier) {
    let list = references.get(symbol) || [];
    if (!list.includes(type)) {
        list.push(type);
        references.set(symbol, list);
    }
}

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
    if (isExportSpecifier(firstDeclaration) || isExportAssignment(firstDeclaration)) {
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

function createCompilerHost(options: CompilerOptions) {
    const host = tsCreateCompilerHost(options);
    const map = {};

    // override getSourceFile
    const originalGetSourceFile = host.getSourceFile;
    host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
        if (fileName in map) {
            return createSourceFile(fileName, map[fileName], languageVersion, true, ScriptKind.TS);
        }
        return originalGetSourceFile.call(host, fileName, languageVersion, onError, shouldCreateNewSourceFile);
    };

    host.resolveModuleNames = (moduleNames: string[], containingFile: string) => {
        const resolvedModules: ResolvedModule[] = [];
        for (const moduleName of moduleNames) {
            let virtualFile = `${resolve(dirname(containingFile), moduleName)}.d.ts`;
            if (virtualFile in map) {
                resolvedModules.push({
                    resolvedFileName: virtualFile,
                });
                continue;
            }
            // try to use standard resolution
            let result = resolveModuleName(moduleName, containingFile, options, sys);
            if (result.resolvedModule) {
                resolvedModules.push(result.resolvedModule);
            }
        }
        return resolvedModules;
    };

    const collector = (fileName, data) => {
        map[fileName] = data;
    };

    const getFileNames = () => {
        return Object.keys(map);
    };

    return { host, collector, getFileNames };
}

export function collect(fileName: string) {
    const compilerOptions: CompilerOptions = { target: ScriptTarget.ESNext, declaration: true };
    const { host, collector, getFileNames } = createCompilerHost(compilerOptions);
    createProgram([fileName], compilerOptions).emit(undefined, collector);
    const program = tsCreateProgram(getFileNames(), compilerOptions, host);
    const typechecker = program.getTypeChecker();
    const symbols: Symbol[] = [];
    const references: ReferencesMap = new Map();
    const symbol = typechecker.getSymbolAtLocation([...program.getSourceFiles()].pop());
    const exported = typechecker.getExportsOfModule(symbol);
    exported.forEach((symbol) => collectSymbol(typechecker, symbols, references, symbol));
    return {
        symbols,
        exported,
        references,
        typechecker,
    };
}