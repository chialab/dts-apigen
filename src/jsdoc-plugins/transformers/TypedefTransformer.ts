import { JSDoc, isJSDocTypedefTag, isJSDocTypeLiteral, createTypeLiteralNode, createPropertySignature, createTypeReferenceNode, createTypeAliasDeclaration, createModifier, SyntaxKind, createToken, createKeywordTypeNode } from 'typescript';
import { parseComment, typescriptToBabel } from '../../helpers/ast';

export function TypedefTransformer({ types }) {
    return {
        name: 'jsdoc-transform-typedef',
        visitor: {
            Program(path) {
                const file = path.container;
                file.comments
                    .map((comment) => {
                        let text = `/*${comment.value}*/`;
                        return parseComment(text);
                    })
                    .filter((comment: JSDoc) => comment && comment.tags && comment.tags.some((tag) => isJSDocTypedefTag(tag)))
                    .map((comment: JSDoc) => [comment.tags.find((tag) => isJSDocTypedefTag(tag)), comment])
                    .forEach(([tag, comment]) => {
                        let typeExpression = tag.typeExpression;
                        let type;
                        if (isJSDocTypeLiteral(typeExpression)) {
                            let properties = typeExpression.jsDocPropertyTags;
                            type = createTypeLiteralNode(
                                properties.map((prop) => createPropertySignature([], (prop.name as any).escapedText, prop.isBracketed ? createToken(SyntaxKind.QuestionToken) : undefined, prop.typeExpression.type.kind === SyntaxKind.JSDocAllType ? createKeywordTypeNode(SyntaxKind.AnyKeyword) : prop.typeExpression.type, undefined))
                            );
                        } else {
                            type = typeExpression.type || createTypeReferenceNode('Object', []);
                        }
                        let typeDeclaration = createTypeAliasDeclaration([], [createModifier(SyntaxKind.ExportKeyword)], tag.name.escapedText as string, [], type);
                        let ast = typescriptToBabel(typeDeclaration);
                        if (comment.comment) {
                            types.addComment(ast, 'leading', `*\n${comment.comment.split('\n').map((line) => ` * ${line}`).join('\n')}\n `);
                        }
                        path.pushContainer('body', ast);
                    });
            },
        },
    };
}