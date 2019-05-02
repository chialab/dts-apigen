import { parseComment } from '../../helpers/ast';

export function EnumTransformer({ types }) {
    return {
        name: 'jsdoc-transform-enum',
        visitor: {
            VariableDeclaration(path) {
                let comments = path.node.leadingComments || [];
                if (path.parentPath.isExportDeclaration()) {
                    comments = path.parent.leadingComments || [];
                }
                let tags = comments
                    .map((comment) => {
                        let text = `/*${comment.value}*/`;
                        return parseComment(text);
                    })
                    .filter(Boolean)
                    .reduce((list, comment) => {
                        if (comment.tags) {
                            list.push(...comment.tags);
                        }
                        return list;
                    }, []);
                let isEnum = tags.some((tag) => ['enum'].includes(tag.tagName.text.toLowerCase()));
                if (!isEnum) {
                    return;
                }
                let declarations = path.get('declarations');
                if (!declarations || declarations.length > 1) {
                    return;
                }
                let declaration = declarations[0];
                if (!declaration.get('init') || !declaration.get('init').isObjectExpression()) {
                    return;
                }
                let enumDecl = types.tsEnumDeclaration(
                    declaration.node.id,
                    declaration.get('init.properties').map((property) => types.tsEnumMember(property.node.key, property.node.value))
                );
                path.replaceWith(enumDecl);
            },
        },
    };
}