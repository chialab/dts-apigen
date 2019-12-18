import { addSyntheticLeadingComment, isJSDocTypedefTag, isJSDocTypeLiteral, createTypeLiteralNode, createPropertySignature, createTypeReferenceNode, createTypeAliasDeclaration, createModifier, SyntaxKind, createToken, createKeywordTypeNode, JSDocTypedefTag } from 'typescript';
import { CommentBlock } from '@babel/types';
import { parseComment, typescriptToBabel } from '../../helpers/ast';

export function TypedefTransformer({ types }) {
    return {
        name: 'jsdoc-transform-typedef',
        visitor: {
            Program(path) {
                const body = path.get('body');
                body.forEach((child) => {
                    const comments = <{ node: CommentBlock }[]> child.get('leadingComments');
                    if (!Array.isArray(comments)) {
                        return;
                    }
                    comments.forEach((comment) => {
                        const jsdoc = parseComment(`/*${comment.node.value}*/`);
                        if (!jsdoc || !jsdoc.tags) {
                            return;
                        }
                        const typedefTags = <JSDocTypedefTag[]> jsdoc.tags.filter((tag) => isJSDocTypedefTag(tag));
                        typedefTags.forEach((tag) => {
                            const typeExpression = tag.typeExpression;

                            let type;
                            if (isJSDocTypeLiteral(typeExpression)) {
                                const properties = typeExpression.jsDocPropertyTags;
                                type = createTypeLiteralNode(
                                    properties.map((prop) => {
                                        const signature = createPropertySignature(
                                            [],
                                            (prop.name as any).escapedText,
                                            prop.isBracketed ? createToken(SyntaxKind.QuestionToken) : undefined,
                                            prop.typeExpression.type.kind === SyntaxKind.JSDocAllType ? createKeywordTypeNode(SyntaxKind.AnyKeyword) : prop.typeExpression.type,
                                            undefined
                                        );

                                        addSyntheticLeadingComment(signature, SyntaxKind.MultiLineCommentTrivia, `* ${prop.comment}`, true);

                                        return signature;
                                    })
                                );
                            } else {
                                type = typeExpression.type || createTypeReferenceNode('Object', []);
                            }

                            const typeDeclaration = createTypeAliasDeclaration([], [createModifier(SyntaxKind.ExportKeyword)], tag.name.escapedText as string, [], type);
                            const ast = typescriptToBabel(typeDeclaration);
                            if (jsdoc.comment) {
                                types.addComment(ast, 'leading', `*\n${jsdoc.comment.split('\n').map((line) => ` * ${line}`).join('\n')}\n `);
                            }
                            comment.node.value = '';
                            child.insertBefore(ast);
                        });
                    });
                });
            },
        },
    };
}