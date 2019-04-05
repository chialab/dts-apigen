import { Node, SyntaxKind, JSDocTag, ClassDeclaration, PropertyDeclaration, MethodDeclaration } from 'typescript';
import { getOriginalNode, createTransformer, getTagByName, addModifier } from '../helpers';

export function visitor(node: Node): Node {
    switch (node.kind) {
        case SyntaxKind.ClassDeclaration: {
            let originalNode = getOriginalNode(node) as ClassDeclaration;
            if (getTagByName(originalNode, 'abstract') || getTagByName(originalNode, 'virtual')) {
                addModifier(node, SyntaxKind.AbstractKeyword);
            }
            break;
        }
        case SyntaxKind.PropertyDeclaration:
        case SyntaxKind.MethodDeclaration: {
            let originalNode = getOriginalNode(node) as PropertyDeclaration|MethodDeclaration;
            if (getTagByName(originalNode, 'readonly')) {
                addModifier(node, SyntaxKind.ReadonlyKeyword);
            }
            let tag: JSDocTag;
            if (tag = getTagByName(originalNode, 'private')) {
                addModifier(node, SyntaxKind.PrivateKeyword);
            } else if (tag = getTagByName(originalNode, 'protected')) {
                addModifier(node, SyntaxKind.ProtectedKeyword);
            } else if (tag = getTagByName(originalNode, 'access')) {
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
