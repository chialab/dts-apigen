import { dirname } from 'path';
import { createCompilerHost as tsCreateCompilerHost, createProgram as tsCreateProgram, Symbol, TypeChecker, isFunctionDeclaration, isExportSpecifier, isTypeParameterDeclaration, isParameter, isClassDeclaration, isInterfaceDeclaration, isModuleDeclaration, isTypeAliasDeclaration, isVariableDeclaration, ScriptTarget, isSourceFile, isFunctionTypeNode, isVariableStatement, Node, isExpressionWithTypeArguments, isConstructorTypeNode, isMethodSignature, isMethodDeclaration, isConstructorDeclaration, isPropertyDeclaration, isPropertySignature, isConstructSignatureDeclaration, isCallSignatureDeclaration, isIndexSignatureDeclaration, isTypeLiteralNode, isUnionTypeNode, isTypeReferenceNode, isArrayTypeNode, isIdentifier, Identifier, isIntersectionTypeNode, isParenthesizedTypeNode, isTupleTypeNode, isMappedTypeNode, isIndexedAccessTypeNode, isTypeOperatorNode, CompilerOptions, createSourceFile, ScriptKind, resolveModuleName, ResolvedModule, sys, isExportAssignment, isImportTypeNode, ModuleResolutionKind, createModuleResolutionCache, ResolvedProjectReference, SyntaxKind, isThisTypeNode, isImportSpecifier, isTypePredicateNode, isLiteralTypeNode, isQualifiedName, isEnumDeclaration, isEnumMember, isToken, isTypeQueryNode, isComputedPropertyName, isPropertyAccessExpression, isInferTypeNode, isConditionalTypeNode, isGetAccessorDeclaration, isSetAccessor, isImportClause, isNamespaceImport, WriteFileCallback, PackageId, StringLiteral } from 'typescript';
import { loadConfig, createProgram } from './Program';
import { getAliasedSymbol, getExports, getExportedSymbol } from './helpers/ast';

export type ReferencesMap = Map<Symbol, Identifier[]>;

export type Sources = { [key: string]: string };

export type ExternalModules = { [key: string]: PackageId };

function collectNodeReferences(typechecker: TypeChecker, symbols: Symbol[], references: ReferencesMap, files: Sources, external: ExternalModules, node: Node) {
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
                collectNodeReferences(typechecker, symbols, references, files, external, typeParam);
            });
        }
        if (node.parameters) {
            node.parameters.forEach((parameter) => {
                collectNodeReferences(typechecker, symbols, references, files, external, parameter);
            });
        }
        if (node.type) {
            collectNodeReferences(typechecker, symbols, references, files, external, node.type);
        }
    } else if (isParameter(node) ||
        isVariableDeclaration(node) ||
        isPropertyDeclaration(node) ||
        isPropertySignature(node)) {
        if (node.name && isComputedPropertyName(node.name)) {
            collectNodeReferences(typechecker, symbols, references, files, external, node.name);
        }
        if (node.type) {
            collectNodeReferences(typechecker, symbols, references, files, external, node.type);
        }
    } else if (isVariableStatement(node)) {
        node.declarationList.declarations.forEach((child) => {
            collectNodeReferences(typechecker, symbols, references, files, external, child);
        });
    } else if (isClassDeclaration(node) ||
        isInterfaceDeclaration(node)) {
        if (node.typeParameters) {
            node.typeParameters.forEach((typeParam) => {
                collectNodeReferences(typechecker, symbols, references, files, external, typeParam);
            });
        }
        if (node.heritageClauses) {
            node.heritageClauses.forEach((clause) => {
                clause.types.forEach((type) => {
                    collectNodeReferences(typechecker, symbols, references, files, external, type);
                });
            });
        }
        if (node.members) {
            (node.members as any).forEach((member) => {
                collectNodeReferences(typechecker, symbols, references, files, external, member);
            });
        }
    } else if (isModuleDeclaration(node)) {
        node.body.forEachChild((child) => {
            collectNodeReferences(typechecker, symbols, references, files, external, child);
        });
    } else if (isEnumDeclaration(node)) {
        if (node.members) {
            (node.members as any).forEach((member) => {
                collectNodeReferences(typechecker, symbols, references, files, external, member);
            });
        }
    } else if (isEnumMember(node)) {
        if (node.initializer) {
            let type = typechecker.getTypeAtLocation(node.initializer);
            if (type) {
                collectNodeReferences(typechecker, symbols, references, files, external, typechecker.typeToTypeNode(type));
            }
        }
    } else if (isIndexSignatureDeclaration(node)) {
        if (node.typeParameters) {
            node.typeParameters.forEach((typeParam) => {
                collectNodeReferences(typechecker, symbols, references, files, external, typeParam);
            });
        }
        if (node.parameters) {
            node.parameters.forEach((parameter) => {
                collectNodeReferences(typechecker, symbols, references, files, external, parameter);
            });
        }
        if (node.type) {
            collectNodeReferences(typechecker, symbols, references, files, external, node.type);
        }
    } else if (isTypeLiteralNode(node)) {
        if (node.members) {
            (node.members as any).forEach((member) => {
                collectNodeReferences(typechecker, symbols, references, files, external, member);
            });
        }
    } else if (isExpressionWithTypeArguments(node) || isComputedPropertyName(node) || isPropertyAccessExpression(node)) {
        if (node.expression) {
            collectNodeReferences(typechecker, symbols, references, files, external, node.expression);
        }
    } else if (isTypeParameterDeclaration(node)) {
        if (node.expression) {
            collectNodeReferences(typechecker, symbols, references, files, external, node.expression);
        }
        if (node.constraint) {
            collectNodeReferences(typechecker, symbols, references, files, external, node.constraint);
        }
    } else if (isUnionTypeNode(node) || isIntersectionTypeNode(node)) {
        node.types.forEach((type) => collectNodeReferences(typechecker, symbols, references, files, external, type));
    } else if (isTypePredicateNode(node)) {
        if (node.parameterName) {
            collectNodeReferences(typechecker, symbols, references, files, external, node.parameterName);
        }
        if (node.type) {
            collectNodeReferences(typechecker, symbols, references, files, external, node.type);
        }
    } else if (isParenthesizedTypeNode(node) || isTypeOperatorNode(node)) {
        if (node.type) {
            collectNodeReferences(typechecker, symbols, references, files, external, node.type);
        }
    } else if (isTupleTypeNode(node)) {
        node.elementTypes.forEach((type) => collectNodeReferences(typechecker, symbols, references, files, external, type));
    } else if (isMappedTypeNode(node)) {
        if (node.typeParameter) {
            collectNodeReferences(typechecker, symbols, references, files, external, node.typeParameter);
        }
        if (node.type) {
            collectNodeReferences(typechecker, symbols, references, files, external, node.type);
        }
    } else if (isTypeAliasDeclaration(node)) {
        if (node.typeParameters) {
            node.typeParameters.forEach((typeParam) => {
                collectNodeReferences(typechecker, symbols, references, files, external, typeParam);
            });
        }
        if (node.type) {
            collectNodeReferences(typechecker, symbols, references, files, external, node.type);
        }
    } else if (isTypeReferenceNode(node)) {
        if (node.typeArguments) {
            node.typeArguments.forEach((type) => collectNodeReferences(typechecker, symbols, references, files, external, type));
        }
        if (node.typeName) {
            collectNodeReferences(typechecker, symbols, references, files, external, node.typeName);
        }
    } else if (isArrayTypeNode(node)) {
        if (node.elementType) {
            collectNodeReferences(typechecker, symbols, references, files, external, node.elementType);
        }
    } else if (isIndexedAccessTypeNode(node)) {
        if (node.objectType) {
            collectNodeReferences(typechecker, symbols, references, files, external, node.objectType);
        }
    } else if (isQualifiedName(node)) {
        if (node.left) {
            collectNodeReferences(typechecker, symbols, references, files, external, node.left);
        }
        if (node.right && !isIdentifier(node.right)) {
            collectNodeReferences(typechecker, symbols, references, files, external, node.right);
        }
    } else if (isIdentifier(node)) {
        let symbol = typechecker.getSymbolAtLocation(node);
        if (symbol) {
            let alias = getAliasedSymbol(typechecker, symbol) || symbol;
            let list = references.get(alias) || [];
            if (!list.includes(node)) list.push(node);
            references.set(alias, list);
            collectSymbol(typechecker, symbols, references, files, external, symbol);
        }
    } else if (isTypeQueryNode(node)) {
        if (node.exprName) {
            collectNodeReferences(typechecker, symbols, references, files, external, node.exprName);
        }
    } else if (isImportClause(node)) {
        let symbol = typechecker.getSymbolAtLocation(node.name);
        if (symbol) {
            collectSymbol(typechecker, symbols, references, files, external, symbol);
        }
    } else if (isImportTypeNode(node)) {
        let symbol = typechecker.getSymbolAtLocation(node.qualifier);
        if (symbol) {
            collectSymbol(typechecker, symbols, references, files, external, symbol);
        }
    } else if (isInferTypeNode(node)) {
        if (node.typeParameter) {
            collectNodeReferences(typechecker, symbols, references, files, external, node.typeParameter);
        }
    } else if (isConditionalTypeNode(node)) {
        if (node.extendsType) {
            collectNodeReferences(typechecker, symbols, references, files, external, node.extendsType);
        }
        if (node.trueType) {
            collectNodeReferences(typechecker, symbols, references, files, external, node.trueType);
        }
        if (node.falseType) {
            collectNodeReferences(typechecker, symbols, references, files, external, node.falseType);
        }
    } else if (isThisTypeNode(node) ||
        isImportSpecifier(node) ||
        isNamespaceImport(node) ||
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

function isExternal(external: ExternalModules, specifier: StringLiteral) {
    const externalModules = Object.values(external).map((packageId) => packageId.name);
    return externalModules.some((name) => specifier.text.indexOf(name) === 0);
}

function collectSpecifier(typechecker: TypeChecker, symbols: Symbol[], references: ReferencesMap, files: Sources, external: ExternalModules, symbol: Symbol, specifier: StringLiteral) {
    let alias = getExportedSymbol(typechecker, symbol);
    if (!alias) {
        return;
    }
    if (alias === symbol) {
        alias = getAliasedSymbol(typechecker, symbol) || symbol;
    }
    if (!specifier || !isExternal(external, specifier)) {
        collectSymbol(typechecker, symbols, references, files, external, alias);
        return;
    }
    symbols.push(alias);
}

function collectSymbol(typechecker: TypeChecker, symbols: Symbol[], references: ReferencesMap, files: Sources, external: ExternalModules, symbol: Symbol) {
    if (symbols.includes(symbol)) {
        // already collected
        return;
    }
    const declarations = symbol.getDeclarations();
    if (!declarations || declarations.length === 0) {
        return;
    }
    const firstDeclaration = declarations[0];
    const sourceFile = firstDeclaration.getSourceFile();
    if (!(sourceFile.fileName in files)) {
        symbols.push(symbol);
        return;
    }
    if (isImportClause(firstDeclaration) && firstDeclaration.namedBindings) {
        let specifier = firstDeclaration.parent.moduleSpecifier as StringLiteral;
        collectSpecifier(typechecker, symbols, references, files, external, symbol, specifier);
    } else if (isImportSpecifier(firstDeclaration)) {
        let specifier = firstDeclaration.parent.parent.parent.moduleSpecifier as StringLiteral;
        collectSpecifier(typechecker, symbols, references, files, external, symbol, specifier);
    } else if (isExportSpecifier(firstDeclaration)) {
        let specifier = firstDeclaration.parent.parent.moduleSpecifier as StringLiteral;
        collectSpecifier(typechecker, symbols, references, files, external, symbol, specifier);
    } else if (isExportAssignment(firstDeclaration)) {
        collectSymbol(typechecker, symbols, references, files, external, typechecker.getAliasedSymbol(symbol));
    } else if (isSourceFile(firstDeclaration)) {
        let exported = getExports(typechecker, symbol);
        exported.forEach((exportedSymbol) => {
            collectSymbol(typechecker, symbols, references, files, external, exportedSymbol);
        });
    } else {
        symbols.push(symbol);
        symbol.declarations.forEach((declaration) => collectNodeReferences(typechecker, symbols, references, files, external, declaration));
    }
}

function createCompilerHost(options: CompilerOptions) {
    const host = tsCreateCompilerHost(options);
    const cache = createModuleResolutionCache(host.getCurrentDirectory(), (x) => host.getCanonicalFileName(x));
    const files: Sources = {};
    const external: ExternalModules = {};

    // override getSourceFile
    const originalGetSourceFile = host.getSourceFile;
    host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
        if (fileName in files) {
            return createSourceFile(fileName, files[fileName], languageVersion, true, ScriptKind.TS);
        }
        return originalGetSourceFile.call(host, fileName, languageVersion, onError, shouldCreateNewSourceFile);
    };

    host.resolveModuleNames = (moduleNames: string[], containingFile: string, reusedNames: string[], redirectedReference: ResolvedProjectReference) => {
        const resolvedModules: ResolvedModule[] = [];
        for (const moduleName of moduleNames) {
            const resolved = resolveModuleName(moduleName, containingFile, options, host, cache, redirectedReference).resolvedModule;
            if (!resolved) {
                resolvedModules.push(undefined);
                continue;
            }
            const virtualFile = resolved.resolvedFileName.replace(new RegExp(`${resolved.extension}$`), '.d.ts');
            if (virtualFile in files) {
                resolvedModules.push({
                    resolvedFileName: virtualFile,
                });
            } else {
                resolvedModules.push(resolved);
            }
            if (moduleName[0] !== '.' && dirname(containingFile) !== dirname(resolved.resolvedFileName)) {
                external[resolved.resolvedFileName] = {
                    name: moduleName,
                    subModuleName: '',
                    version: '',
                };
            } else if (resolved.packageId) {
                external[resolved.resolvedFileName] = resolved.packageId;
            }
        }
        return resolvedModules;
    };

    const collector: WriteFileCallback = (fileName, data) => {
        files[fileName] = data;
    };

    return { host, collector, external, files };
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
    const compilerOptions: CompilerOptions = loadConfig(fileName, {
        target: ScriptTarget.ESNext,
        moduleResolution: ModuleResolutionKind.NodeJs,
        declaration: true,
    });
    const { host, collector, files, external } = createCompilerHost(compilerOptions);
    createProgram([fileName], compilerOptions).emit(undefined, collector);
    const fileNames = Object.keys(files);
    const program = tsCreateProgram(fileNames, compilerOptions, host);
    const typechecker = program.getTypeChecker();
    const symbols: Symbol[] = [];
    const references: ReferencesMap = new Map();
    const symbol = typechecker.getSymbolAtLocation(program.getSourceFile(fileNames[fileNames.length - 1]));
    const exported = getExports(typechecker, symbol);
    exported.forEach((symbol) => collectSymbol(typechecker, symbols, references, files, external, symbol));
    return {
        files,
        external,
        symbols,
        exported,
        references,
        typechecker,
    };
}