import { Node, SyntaxKind, SourceFile, forEachChild, JSDoc, createTypeAliasDeclaration, JSDocTypedefTag, createTypeLiteralNode, createTypeReferenceNode, createPropertySignature, isJSDocTypeLiteral, createKeywordTypeNode } from 'typescript';
import { getOriginalNode, createTransformer, getTagsByName } from '../helpers';
import { Token } from '@microsoft/tsdoc';

function innerVistor(node: Node): JSDoc[] {
    let tags = getTagsByName(node, 'typedef').map((tag) => tag.parent as JSDoc);
    forEachChild(node, (child) => {
        innerVistor(child).forEach((comment) => {
            if (tags.indexOf(comment) === -1) {
                tags.push(comment);
            }
        })
    });
    return tags;
}

export function visitor(node: Node): Node {
    switch (node.kind) {
        case SyntaxKind.SourceFile: {
            let comments = innerVistor(getOriginalNode(node));
            comments.forEach((comment) => {
                let typedef: JSDocTypedefTag = comment.tags.find((tag) => tag.tagName.escapedText === 'typedef') as JSDocTypedefTag;
                let typeExpression = typedef.typeExpression;
                let type;
                if (isJSDocTypeLiteral(typeExpression)) {
                    let properties = typeExpression.jsDocPropertyTags;
                    type = createTypeLiteralNode(
                        properties.map((prop) => createPropertySignature([], prop.name.getText(), prop.isBracketed ? Token[SyntaxKind.QuestionToken] : undefined, prop.typeExpression.type.kind === SyntaxKind.JSDocAllType ? createKeywordTypeNode(SyntaxKind.AnyKeyword) : prop.typeExpression.type, undefined))
                    );
                } else {
                    type = typeExpression.type || createTypeReferenceNode('Object', []);
                }
                let typeDeclaration = createTypeAliasDeclaration([], [], typedef.name.escapedText as string, [], type);
                ((node as SourceFile).statements as any).unshift(typeDeclaration);
            });
            break;
        }
    }
    return node;
}

export const transformer = createTransformer(visitor);
