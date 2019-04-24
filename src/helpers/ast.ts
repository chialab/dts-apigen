import { Node, getJSDocTags, JSDocTag, FunctionDeclaration, MethodDeclaration, isJSDocParameterTag, SyntaxKind, createModifier, createModifiersFromModifierFlags, Modifier, isModuleDeclaration, visitNode, visitNodes } from 'typescript';

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
    let tags = getJSDocTags(getOriginalNode(node)) || [];
    return tags.filter((tag) => tag.tagName.escapedText === name);
}

/**
 * Get a JSDoc tag by name for a node
 * @param node The scope node
 * @param name The tag name
 * @return The JSDoc tag reference
 */
export function getJSDocTagByName(node: Node, name: string): JSDocTag {
    let tags = getJSDocTags(node) || [];
    return tags.find((tag) => tag.tagName.escapedText === name);
}

/**
 * Get the JSDoc description for a node
 * @param node The scope node
 * @return The description of the node
 */
export function getJSDocDescription(node: Node & { jsDoc?: any[] }): string {
    let comments = node.jsDoc || [];
    let comment = comments[comments.length - 1];
    if (!comment || !comment.comment) {
        return null;
    }
    return comment.comment.replace(/[ ]*\*/g, '');
}

/**
 * Get the JSDoc examples for a node
 * @param node The scope node
 * @return A list of examples for the node
 */
export function getJSDocExamples(node: Node & { jsDoc?: any[] }): string[] {
    let tags = getJSDocTagsByName(node, 'example') || [];
    return tags.map((tag) => tag.comment.replace(/[ ]*\*/g, ''));
}

/**
 * Get a JSDoc description for a parameter
 * @param node The function node reference
 * @param paramName The param name to retrieve
 * @return The description of the parameter
 */
export function getJSDocParamDescription(node: FunctionDeclaration|MethodDeclaration, paramName: string): string {
    let tags = getJSDocTags(getOriginalNode(node)) || [];
    let tag = tags.find((tag) => isJSDocParameterTag(tag) && tag.name.getText() === paramName);
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
    let tags = getJSDocTags(getOriginalNode(node)) || [];
    let tag = tags.find((tag) => tag.kind === SyntaxKind.JSDocReturnTag);
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
    let modifier = createModifier(kind);
    modifier.parent = node;
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
    let list: Modifier[] = (node.modifiers as any);
    let modifier = list.find((modifier) => modifier.kind === kind);
    if (!modifier) {
        return;
    }
    list.splice(list.indexOf(modifier), 1);
    delete node['modifierFlagsCache'];
}

/**
 * Check if a Node is exported
 * @param node The node to check
 */
export function isExported(node: Node): boolean {
    if (node.parent && node.parent.parent && isModuleDeclaration(node.parent.parent)) {
        return true;
    }
    if (!node.modifiers) {
        return false;
    }
    return node.modifiers.some((mod) => mod.kind === SyntaxKind.ExportKeyword);
}

/**
 * Traverse an AST object
 * @param root The root object to traverse
 * @param callback The callback to trigger for each child.
 */
export function traverse(root: Node, callback: (node: Node) => boolean|void): void {
    const visit = (node) => {
        if (!node) {
            return;
        }
        if (callback(node) === false) {
            // stop
            return;
        }
        if (node.left) {
            visitNode(node.left, visit);
        }
        if (node.tag) {
            visitNode(node.tag, visit);
        }
        if (node.operand) {
            visitNode(node.operand, visit);
        }
        if (node.condition) {
            visitNode(node.condition, visit);
        }
        if (node.head) {
            visitNode(node.head, visit);
        }
        if (node.type) {
            visitNode(node.type, visit);
        }
        if (node.elementType) {
            visitNode(node.elementType, visit);
        }
        if (node.objectType) {
            visitNode(node.objectType, visit);
        }
        if (node.checkType) {
            visitNode(node.checkType, visit);
        }
        if (node.typeParameter) {
            visitNode(node.typeParameter, visit);
        }
        if (node.expression) {
            visitNode(node.expression, visit);
        }
        if (node.argument) {
            visitNode(node.argument, visit);
        }
        if (node.name) {
            visitNode(node.name, visit);
        }
        if (node.typeName) {
            visitNode(node.typeName, visit);
        }
        if (node.parameterName) {
            visitNode(node.parameterName, visit);
        }
        if (node.propertyName) {
            visitNode(node.propertyName, visit);
        }
        if (node.tagName) {
            visitNode(node.tagName, visit);
        }
        if (node.exprName) {
            visitNode(node.exprName, visit);
        }
        if (node.readonlyToken) {
            visitNode(node.readonlyToken, visit);
        }
        if (node.dotDotDotToken) {
            visitNode(node.dotDotDotToken, visit);
        }
        if (node.asteriskToken) {
            visitNode(node.asteriskToken, visit);
        }
        if (node.initializer) {
            visitNode(node.initializer, visit);
        }
        if (node.body) {
            visitNode(node.body, visit);
        }
        if (node.tryBlock) {
            visitNode(node.tryBlock, visit);
        }
        if (node.openingFragment) {
            visitNode(node.openingFragment, visit);
        }
        if (node.variableDeclaration) {
            visitNode(node.variableDeclaration, visit);
        }
        if (node.awaitModifier) {
            visitNode(node.awaitModifier, visit);
        }
        if (node.label) {
            visitNode(node.label, visit);
        }
        if (node.literal) {
            visitNode(node.literal, visit);
        }
        if (node.types) {
            visitNodes(node.types, visit);
        }
        if (node.typeArguments) {
            visitNodes(node.typeArguments, visit);
        }
        if (node.typeParameters) {
            visitNodes(node.typeParameters, visit);
        }
        if (node.elementTypes) {
            visitNodes(node.elementTypes, visit);
        }
        if (node.declarationList) {
            visitNode(node.declarationList, visit);
        }
        if (node.decorators) {
            visitNodes(node.decorators, visit);
        }
        if (node.modifiers) {
            visitNodes(node.modifiers, visit);
        }
        if (node.parameters) {
            visitNodes(node.parameters, visit);
        }
        if (node.declarations) {
            visitNodes(node.declarations, visit);
        }
        if (node.statements) {
            visitNodes(node.statements, visit);
        }
        if (node.elements) {
            visitNodes(node.elements, visit);
        }
        if (node.properties) {
            visitNodes(node.properties, visit);
        }
        if (node.members) {
            visitNodes(node.members, visit);
        }
        if (node.clauses) {
            visitNodes(node.clauses, visit);
        }
        return node;
    };
    visitNode(root, visit);
}