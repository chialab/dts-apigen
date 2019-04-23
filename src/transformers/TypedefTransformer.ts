import { Node, SyntaxKind, SourceFile, forEachChild, JSDoc, createTypeAliasDeclaration, JSDocTypedefTag, createTypeLiteralNode, createTypeReferenceNode, createPropertySignature, isJSDocTypeLiteral, createKeywordTypeNode, createToken, updateSourceFileNode, createModifier } from 'typescript';
import { getOriginalNode, getJSDocTagsByName } from '../helpers/ast';
import { createTransformer } from '../helpers/transformer';

function innerVistor(node: Node): JSDoc[] {
    let tags = getJSDocTagsByName(node, 'typedef').map((tag) => tag.parent as JSDoc);
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
            let typedefStatements = [];
            comments.forEach((comment) => {
                let typedef: JSDocTypedefTag = comment.tags.find((tag) => tag.tagName.escapedText === 'typedef') as JSDocTypedefTag;
                let typeExpression = typedef.typeExpression;
                let type;
                if (isJSDocTypeLiteral(typeExpression)) {
                    let properties = typeExpression.jsDocPropertyTags;
                    type = createTypeLiteralNode(
                        properties.map((prop) => createPropertySignature([], prop.name.getText(), prop.isBracketed ? createToken(SyntaxKind.QuestionToken) : undefined, prop.typeExpression.type.kind === SyntaxKind.JSDocAllType ? createKeywordTypeNode(SyntaxKind.AnyKeyword) : prop.typeExpression.type, undefined))
                    );
                } else {
                    type = typeExpression.type || createTypeReferenceNode('Object', []);
                }
                let typeDeclaration = createTypeAliasDeclaration([], [createModifier(SyntaxKind.DeclareKeyword)], typedef.name.escapedText as string, [], type);
                typedefStatements.push(typeDeclaration);
            });
            return updateSourceFileNode(node as SourceFile, [...typedefStatements, ...(node as SourceFile).statements], (node as SourceFile).isDeclarationFile);
        }
    }
    return node;
}

export const transformer = createTransformer(visitor);
