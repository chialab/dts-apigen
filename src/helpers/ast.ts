import { Node, getJSDocTags, JSDocTag, FunctionDeclaration, MethodDeclaration, isJSDocParameterTag, SyntaxKind, createModifier, createModifiersFromModifierFlags, Modifier, visitNode, visitNodes, JSDoc, createSourceFile, ScriptTarget, createPrinter, EmitHint, createVariableStatement, createVariableDeclarationList, createVariableDeclaration, TypeNode, TypeChecker, Symbol, isExportSpecifier, isVariableDeclaration } from 'typescript';

/**
 * Get the original typeched node of a node
 */
export function getOriginalNode(node: Node & { original?: Node }): Node {
    if (node.original) {
        return node.original;
    }
    return node;
}

/**
 * Get a list of JSDoc tags by name for a node
 * @param node The scope node
 * @param name The tag name
 * @return The JSDoc tags list
 */
export function getJSDocTagsByName(node: Node, name: string): ReadonlyArray<JSDocTag> {
    const tags = getJSDocTags(getOriginalNode(node)) || [];
    return tags.filter((tag) => tag.tagName.escapedText === name);
}

/**
 * Get a JSDoc tag by name for a node
 * @param node The scope node
 * @param name The tag name
 * @return The JSDoc tag reference
 */
export function getJSDocTagByName(node: Node, name: string): JSDocTag {
    const tags = getJSDocTags(node) || [];
    return tags.find((tag) => tag.tagName.escapedText === name);
}

/**
 * Get the JSDoc description for a node
 * @param node The scope node
 * @return The description of the node
 */
export function getJSDocDescription(node: Node & { jsDoc?: any[] }): string {
    const comments = node.jsDoc || [];
    const comment = comments[comments.length - 1];
    if (!comment || !comment.comment) {
        return null;
    }
    return comment.comment.replace(/^[ ]*\*/gm, '');
}

/**
 * Get the JSDoc examples for a node
 * @param node The scope node
 * @return A list of examples for the node
 */
export function getJSDocExamples(node: Node & { jsDoc?: any[] }): JSDocTag[] {
    const tags = getJSDocTagsByName(node, 'example') || [];
    return tags.map((tag) => {
        let result = Object.assign({}, tag);
        (result as any).comment = result.comment.replace(/[ ]*\*/g, '');
        return result;
    });
}

type JSDocSeeTagLink = {
    reference: string | Node;
    text: string;
}

export type JSDocSeeTag = JSDocTag & {
    interpolated: (string | JSDocSeeTagLink)[];
};

/**
 * Get the JSDoc see links for a node
 * @param node The scope node
 * @return A list of see links for the node
 */
export function getJSDocSeeLinks(node: Node & { jsDoc?: any[] }): JSDocSeeTag[] {
    const tags = getJSDocTagsByName(node, 'see') || [];
    return tags.map((tag) => {
        const result = Object.assign({
            interpolated: [],
        }, tag);
        const chunks = tag.comment.split(/((?:\[[^]]*\])?{@link [^\s}|]*(?:[|\s][^}]*)?})/ig);
        chunks.forEach((chunk, index) => {
            if (index % 2 === 0) {
                result.interpolated.push(chunk);
            } else {
                const match = chunk.match(/(?:\[([^]]*)\])?{@link ([^\s}|]*)(?:[|\s]([^}]*))?}/i);
                result.interpolated.push({
                    text: match[1] || match[3] || match[2],
                    reference: match[2],
                });
            }
        });
        return result;
    });
}

/**
 * Get a JSDoc description for a parameter
 * @param node The function node reference
 * @param paramName The param name to retrieve
 * @return The description of the parameter
 */
export function getJSDocParamDescription(node: FunctionDeclaration|MethodDeclaration, paramName: string): string {
    const tags = getJSDocTags(getOriginalNode(node)) || [];
    const tag = tags.find((tag) => isJSDocParameterTag(tag) && tag.name.getText() === paramName);
    if (!tag) {
        return null;
    }
    return tag.comment;
}

/**
 * Get a JSDoc description for a return statement
 * @param node The function node reference
 * @return The description of the return statement
 */
export function getJSDocReturnDescription(node: FunctionDeclaration|MethodDeclaration): string {
    const tags = getJSDocTags(getOriginalNode(node)) || [];
    const tag = tags.find((tag) => tag.kind === SyntaxKind.JSDocReturnTag);
    if (!tag) {
        return null;
    }
    return tag.comment;
}

/**
 * Check if node has modifier
 * @param node The node to update
 * @param kind THe kind of the modifier to add
 */
export function hasModifier(node: Node, kind: number) {
    if (!node.modifiers) {
        return false;
    }
    return (node.modifiers as any).some((modifier) => modifier.kind === kind);
}

/**
 * Update modifiers for a node
 * @param node The node to update
 * @param kind THe kind of the modifier to add
 */
export function addModifier(node: Node, kind: number, before = false) {
    if (hasModifier(node, kind)) {
        removeModifier(node, kind);
    }
    let modifier = createModifier(kind);
    (modifier as any).parent = node;
    if (!node.modifiers) {
        (node.modifiers as any) = createModifiersFromModifierFlags(0);
        (node.modifiers as any).pos = -1;
        (node.modifiers as any).end = -1;
    }
    if (before) {
        (node.modifiers as any).unshift(modifier);
    } else {
        (node.modifiers as any).push(modifier);
    }
    delete node['modifierFlagsCache'];
}

/**
 * Remove a modifier for a node
 * @param node The node to update
 * @param kind THe kind of the modifier to remove
 */
export function removeModifier(node: Node, kind: number) {
    if (!node.modifiers) {
        return;
    }
    const list: Modifier[] = (node.modifiers as any);
    const modifier = list.find((modifier) => modifier.kind === kind);
    if (!modifier) {
        return;
    }
    list.splice(list.indexOf(modifier), 1);
    delete node['modifierFlagsCache'];
}

/**
 * Traverse an AST object
 * @param root The root object to traverse
 * @param callback The callback to trigger for each child.
 */
export function traverse(root: Node, callback: (node: Node) => boolean | void): void {
    const visited = [];
    const visit = (node) => {
        if (!node) {
            return;
        }
        if (visited.includes(node)) {
            return;
        }
        visited.push(node);
        if (node.left) {
            visitNode(node.left, visitAndRun);
        }
        if (node.tag) {
            visitNode(node.tag, visitAndRun);
        }
        if (node.operand) {
            visitNode(node.operand, visitAndRun);
        }
        if (node.condition) {
            visitNode(node.condition, visitAndRun);
        }
        if (node.head) {
            visitNode(node.head, visitAndRun);
        }
        if (node.type) {
            visitNode(node.type, visitAndRun);
        }
        if (node.elementType) {
            visitNode(node.elementType, visitAndRun);
        }
        if (node.objectType) {
            visitNode(node.objectType, visitAndRun);
        }
        if (node.checkType) {
            visitNode(node.checkType, visitAndRun);
        }
        if (node.typeParameter) {
            visitNode(node.typeParameter, visitAndRun);
        }
        if (node.expression) {
            visitNode(node.expression, visitAndRun);
        }
        if (node.argument) {
            visitNode(node.argument, visitAndRun);
        }
        if (node.name) {
            visitNode(node.name, visitAndRun);
        }
        if (node.typeName) {
            visitNode(node.typeName, visitAndRun);
        }
        if (node.parameterName) {
            visitNode(node.parameterName, visitAndRun);
        }
        if (node.propertyName) {
            visitNode(node.propertyName, visitAndRun);
        }
        if (node.tagName) {
            visitNode(node.tagName, visitAndRun);
        }
        if (node.exprName) {
            visitNode(node.exprName, visitAndRun);
        }
        if (node.readonlyToken) {
            visitNode(node.readonlyToken, visitAndRun);
        }
        if (node.dotDotDotToken) {
            visitNode(node.dotDotDotToken, visitAndRun);
        }
        if (node.asteriskToken) {
            visitNode(node.asteriskToken, visitAndRun);
        }
        if (node.initializer) {
            visitNode(node.initializer, visitAndRun);
        }
        if (node.body) {
            visitNode(node.body, visitAndRun);
        }
        if (node.tryBlock) {
            visitNode(node.tryBlock, visitAndRun);
        }
        if (node.openingFragment) {
            visitNode(node.openingFragment, visitAndRun);
        }
        if (node.variableDeclaration) {
            visitNode(node.variableDeclaration, visitAndRun);
        }
        if (node.awaitModifier) {
            visitNode(node.awaitModifier, visitAndRun);
        }
        if (node.label) {
            visitNode(node.label, visitAndRun);
        }
        if (node.literal) {
            visitNode(node.literal, visitAndRun);
        }
        if (node.types) {
            visitNodes(node.types, visitAndRun);
        }
        if (node.typeArguments) {
            visitNodes(node.typeArguments, visitAndRun);
        }
        if (node.typeParameters) {
            visitNodes(node.typeParameters, visitAndRun);
        }
        if (node.elementTypes) {
            visitNodes(node.elementTypes, visitAndRun);
        }
        if (node.declarationList) {
            visitNode(node.declarationList, visitAndRun);
        }
        if (node.decorators) {
            visitNodes(node.decorators, visitAndRun);
        }
        if (node.modifiers) {
            visitNodes(node.modifiers, visitAndRun);
        }
        if (node.parameters) {
            visitNodes(node.parameters, visitAndRun);
        }
        if (node.declarations) {
            visitNodes(node.declarations, visitAndRun);
        }
        if (node.statements) {
            visitNodes(node.statements, visitAndRun);
        }
        if (node.elements) {
            visitNodes(node.elements, visitAndRun);
        }
        if (node.properties) {
            visitNodes(node.properties, visitAndRun);
        }
        if (node.members) {
            visitNodes(node.members, visitAndRun);
        }
        if (node.clauses) {
            visitNodes(node.clauses, visitAndRun);
        }
        return node;
    };
    const visitAndRun = (node) => {
        if (!node) {
            return;
        }
        if (callback(node) === false) {
            // stop
            return;
        }
        visit(node);
        return node;
    }
    visit(root);
}

export function parseComment(text: string): JSDoc {
    let source = createSourceFile('', text, ScriptTarget.ESNext);
    if (!source.endOfFileToken['jsDoc']) {
        return;
    }
    let ast: JSDoc = source.endOfFileToken['jsDoc'][0];
    return ast;
}

export function getAliasedSymbol(typechecker: TypeChecker, symbol: Symbol): Symbol {
    try {
        return typechecker.getAliasedSymbol(symbol);
    } catch (error) {
        //
    }
}

export function getExports(typechecker: TypeChecker, symbol: Symbol) {
    return typechecker.getExportsOfModule(symbol)
        .filter((symbol) => {
            let declaration: Node = symbol.getDeclarations()[0];
            if (isExportSpecifier(declaration)) {
                return true;
            }
            if (isVariableDeclaration(declaration)) {
                declaration = declaration.parent.parent;
            }
            return hasModifier(declaration, SyntaxKind.ExportKeyword);
        });
}

export function getExportedSymbol(typechecker: TypeChecker, symbol: Symbol) {
    const alias = getAliasedSymbol(typechecker, symbol);
    if (!alias) {
        return;
    }
    const sourceFile = alias.getDeclarations()[0].getSourceFile();
    const sourceSymbol = typechecker.getSymbolAtLocation(sourceFile);
    if (!sourceSymbol) {
        return;
    }
    const exported = typechecker.getExportsOfModule(sourceSymbol);
    return exported.find((exportedSymbol) =>
        exportedSymbol === alias ||
        getAliasedSymbol(typechecker, exportedSymbol) === alias
    );
}
