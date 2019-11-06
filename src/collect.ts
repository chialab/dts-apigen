import { resolve, dirname } from 'path';
import { createCompilerHost as tsCreateCompilerHost, createProgram as tsCreateProgram, Symbol, TypeChecker, isFunctionDeclaration, isExportSpecifier, isTypeParameterDeclaration, isParameter, isClassDeclaration, isInterfaceDeclaration, isModuleDeclaration, isTypeAliasDeclaration, isVariableDeclaration, ScriptTarget, isSourceFile, isFunctionTypeNode, isVariableStatement, Node, isExpressionWithTypeArguments, isConstructorTypeNode, isMethodSignature, isMethodDeclaration, isConstructorDeclaration, isPropertyDeclaration, isPropertySignature, isConstructSignatureDeclaration, isCallSignatureDeclaration, isIndexSignatureDeclaration, isTypeLiteralNode, isUnionTypeNode, isTypeReferenceNode, isArrayTypeNode, isIdentifier, Identifier, isIntersectionTypeNode, isParenthesizedTypeNode, isTupleTypeNode, isMappedTypeNode, isIndexedAccessTypeNode, isTypeOperatorNode, CompilerOptions, createSourceFile, ScriptKind, resolveModuleName, ResolvedModule, sys, isExportAssignment, isImportTypeNode, ModuleResolutionKind, createModuleResolutionCache, ResolvedProjectReference, SyntaxKind, isThisTypeNode, isImportSpecifier, isTypePredicateNode, isLiteralTypeNode, isQualifiedName, isEnumDeclaration, isEnumMember, isToken, isTypeQueryNode, isComputedPropertyName, isPropertyAccessExpression, isInferTypeNode, isConditionalTypeNode, isGetAccessorDeclaration, isSetAccessor, isImportClause } from 'typescript';
import { createProgram } from './Program';

export type ReferencesMap = Map<Symbol, Identifier[]>;

export function addReference(references: ReferencesMap, symbol: Symbol, type: Identifier) {
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
        isCallSignatureDeclaration(node) ||
        isGetAccessorDeclaration(node) ||
        isSetAccessor(node)) {
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
        if (node.name && isComputedPropertyName(node.name)) {
            collectNodeReferences(typechecker, symbols, references, node.name);
        }
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
    } else if (isEnumDeclaration(node)) {
        if (node.members) {
            (node.members as any).forEach((member) => {
                collectNodeReferences(typechecker, symbols, references, member);
            });
        }
    } else if (isEnumMember(node)) {
        if (node.initializer) {
            let type = typechecker.getTypeAtLocation(node.initializer);
            if (type) {
                collectNodeReferences(typechecker, symbols, references, typechecker.typeToTypeNode(type));
            }
        }
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
    } else if (isExpressionWithTypeArguments(node) || isComputedPropertyName(node) || isPropertyAccessExpression(node)) {
        if (node.expression) {
            collectNodeReferences(typechecker, symbols, references, node.expression);
        }
    } else if (isTypeParameterDeclaration(node)) {
        if (node.expression) {
            collectNodeReferences(typechecker, symbols, references, node.expression);
        }
        if (node.constraint) {
            collectNodeReferences(typechecker, symbols, references, node.constraint);
        }
    } else if (isUnionTypeNode(node) || isIntersectionTypeNode(node)) {
        node.types.forEach((type) => collectNodeReferences(typechecker, symbols, references, type));
    } else if (isTypePredicateNode(node)) {
        if (node.parameterName) {
            collectNodeReferences(typechecker, symbols, references, node.parameterName);
        }
        if (node.type) {
            collectNodeReferences(typechecker, symbols, references, node.type);
        }
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
    } else if (isQualifiedName(node)) {
        if (node.left) {
            collectNodeReferences(typechecker, symbols, references, node.left);
        }
        if (node.right) {
            collectNodeReferences(typechecker, symbols, references, node.right);
        }
    } else if (isIdentifier(node)) {
        let symbol = typechecker.getSymbolAtLocation(node);
        if (symbol) {
            let declarations = (symbol.getDeclarations() || []).filter((declaration) => !(isParameter(declaration) || isTypeParameterDeclaration(declaration)));
            if (declarations.length) {
                addReference(references, symbol, node);
                collectSymbol(typechecker, symbols, references, symbol);
            }
        }
    } else if (isTypeQueryNode(node)) {
        if (node.exprName) {
            collectNodeReferences(typechecker, symbols, references, node.exprName);
        }
    } else if (isImportClause(node)) {
        let symbol = typechecker.getSymbolAtLocation(node.name);
        if (symbol) {
            collectSymbol(typechecker, symbols, references, symbol);
        }
    } else if (isImportTypeNode(node)) {
        let symbol = typechecker.getSymbolAtLocation(node);
        if (symbol) {
            collectSymbol(typechecker, symbols, references, symbol);
        }
    } else if (isInferTypeNode(node)) {
        if (node.typeParameter) {
            collectNodeReferences(typechecker, symbols, references, node.typeParameter);
        }
    } else if (isConditionalTypeNode(node)) {
        if (node.extendsType) {
            collectNodeReferences(typechecker, symbols, references, node.extendsType);
        }
        if (node.trueType) {
            collectNodeReferences(typechecker, symbols, references, node.trueType);
        }
        if (node.falseType) {
            collectNodeReferences(typechecker, symbols, references, node.falseType);
        }
    } else if (isThisTypeNode(node) ||
        isImportSpecifier(node) ||
        isLiteralTypeNode(node) ||
        isToken(node) ||
        [
            SyntaxKind.UnknownKeyword,
            SyntaxKind.VoidKeyword,
            SyntaxKind.UndefinedKeyword,
            SyntaxKind.NullKeyword,
            SyntaxKind.BooleanKeyword,
            SyntaxKind.NumberKeyword,
            SyntaxKind.ObjectKeyword,
            SyntaxKind.StringKeyword,
            SyntaxKind.SymbolKeyword,
            SyntaxKind.AnyKeyword,
        ].includes(node.kind)) {
        // ignore
    } else {
        console.log('unhandled type', SyntaxKind[node.kind], node, node.getSourceFile().fileName);
    }
}

function collectSymbol(typechecker: TypeChecker, symbols: Symbol[], references: ReferencesMap, symbol: Symbol) {
    if (symbols.includes(symbol)) {
        // already collected
        return;
    }
    if (!symbol.getDeclarations() || symbol.getDeclarations().length === 0 ) {
        return;
    }
    const firstDeclaration = symbol.getDeclarations()[0];
    if (isImportSpecifier(firstDeclaration) || isExportSpecifier(firstDeclaration) || isExportAssignment(firstDeclaration)) {
        collectSymbol(typechecker, symbols, references, typechecker.getAliasedSymbol(symbol));
    } else if (isSourceFile(firstDeclaration)) {
        if (firstDeclaration.fileName.includes('node_modules')) {
            return;
        }
        let exported = typechecker.getExportsOfModule(symbol);
        exported.forEach((exportedSymbol) => {
            collectSymbol(typechecker, symbols, references, exportedSymbol);
        });
    } else {
        if (symbol.getName() === 'node' && symbol.valueDeclaration.getSourceFile().fileName.endsWith('dom.d.ts')) {
            try {
                throw new Error('ighi');
            } catch (error) {
                console.log(error.stack)
            }
        }
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

    let cache;
    host.resolveModuleNames = (moduleNames: string[], containingFile: string, reusedNames: string[], redirectedReference: ResolvedProjectReference) => {
        cache = cache || createModuleResolutionCache(host.getCurrentDirectory(), (x) => host.getCanonicalFileName(x));
        const resolvedModules: ResolvedModule[] = [];
        for (const moduleName of moduleNames) {
            let virtualFile = `${resolve(dirname(containingFile), moduleName)}.d.ts`;
            if (virtualFile in map) {
                resolvedModules.push({
                    resolvedFileName: virtualFile,
                });
            } else {
                // try to use standard resolution
                resolvedModules.push(resolveModuleName(moduleName, containingFile, options, host, cache, redirectedReference).resolvedModule);
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

/**
 * Collect typechecker symbols for a module.
 * @param fileName The module entry file.
 * @return A set of data including all used symbols, exported symbols, references and the typechecker instance.
 * 
 * @example
 * ```ts
 * import { collect } from 'dts-apigen';
 * 
 * const { exported } = collect('src/index.ts');
 * exported.forEach((exportedSymbol) => {
 *    console.log('exporting', exportedSymbol.getName());
 * });
 * ```
 */
export function collect(fileName: string) {
    const compilerOptions: CompilerOptions = {
        target: ScriptTarget.ESNext,
        moduleResolution: ModuleResolutionKind.NodeJs,
        declaration: true,
    };
    const { host, collector, getFileNames } = createCompilerHost(compilerOptions);
    createProgram([fileName], compilerOptions).emit(undefined, collector);
    const files = getFileNames();
    const program = tsCreateProgram(files, compilerOptions, host);
    const typechecker = program.getTypeChecker();
    const symbols: Symbol[] = [];
    const references: ReferencesMap = new Map();
    const symbol = typechecker.getSymbolAtLocation(program.getSourceFile(files[files.length - 1]));
    const exported = typechecker.getExportsOfModule(symbol);
    exported.forEach((symbol) => collectSymbol(typechecker, symbols, references, symbol));
    return {
        symbols,
        exported,
        references,
        typechecker,
    };
}