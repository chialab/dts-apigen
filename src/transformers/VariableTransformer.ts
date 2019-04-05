import { SyntaxKind, Node, NodeFlags, JSDocTag, VariableDeclarationList } from 'typescript';
import { getOriginalNode, createTransformer, getTagByName } from '../helpers';

export function visitor(node: Node): Node {
    switch (node.kind) {
        case SyntaxKind.VariableDeclarationList: {
            if (node.flags !== NodeFlags.Synthesized) {
                return node;
            }
            let originalNode = getOriginalNode(node) as VariableDeclarationList;
            let kind: JSDocTag;
            if (!originalNode.parent) {
                break;
            }
            if (getTagByName(originalNode.parent, 'const') || getTagByName(originalNode.parent, 'constant')) {
                (node.flags as any) = NodeFlags.Const;
            } else if (kind = getTagByName(originalNode.parent, 'kind')) {
                let value = kind.comment.trim().toLowerCase();
                if (value === 'const' || value === 'constant') {
                    (node.flags as any) = NodeFlags.Const;
                } else {
                    (node.flags as any) = NodeFlags.Let;
                }
            }
            break;
        }
    }
    return node;
}

export const transformer = createTransformer(visitor);
