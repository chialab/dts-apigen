import { Node, getJSDocTags, JSDocTag, FunctionDeclaration, MethodDeclaration, isJSDocParameterTag, SyntaxKind, createModifier, createModifiersFromModifierFlags, Modifier, isModuleDeclaration } from 'typescript';

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