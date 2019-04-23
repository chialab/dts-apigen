import { Node, SyntaxKind, JSDocTag, ClassDeclaration, PropertyDeclaration, MethodDeclaration } from 'typescript';
import { getOriginalNode, getJSDocTagByName, addModifier } from '../helpers/ast';
import { createTransformer } from '../helpers/transformer';

export function visitor(node: Node): Node {
    switch (node.kind) {
        case SyntaxKind.ClassDeclaration: {
            let originalNode = getOriginalNode(node) as ClassDeclaration;
            if (getJSDocTagByName(originalNode, 'abstract') || getJSDocTagByName(originalNode, 'virtual')) {
                addModifier(node, SyntaxKind.AbstractKeyword);
            }
            break;
        }
        case SyntaxKind.PropertyDeclaration:
        case SyntaxKind.MethodDeclaration: {
            let originalNode = getOriginalNode(node) as PropertyDeclaration|MethodDeclaration;
            if (getJSDocTagByName(originalNode, 'readonly')) {
                addModifier(node, SyntaxKind.ReadonlyKeyword);
            }
            let tag: JSDocTag;
            if (tag = getJSDocTagByName(originalNode, 'private')) {
                addModifier(node, SyntaxKind.PrivateKeyword);
            } else if (tag = getJSDocTagByName(originalNode, 'protected')) {
                addModifier(node, SyntaxKind.ProtectedKeyword);
            } else if (tag = getJSDocTagByName(originalNode, 'access')) {
                let value = tag.comment.trim().toLowerCase();
                if (value === 'private') {
                    addModifier(node, SyntaxKind.PrivateKeyword);
                } else if (value === 'protected') {
                    addModifier(node, SyntaxKind.ProtectedKeyword);
                }
            }
            break;
        }
    }
    return node;
}

export const transformer = createTransformer(visitor);
