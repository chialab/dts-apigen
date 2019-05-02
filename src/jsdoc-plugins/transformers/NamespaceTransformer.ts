import { parseComment } from '../../helpers/ast';

export function NamespaceTransformer({ types }) {
    return {
        name: 'jsdoc-transform-namespace',
        visitor: {
            VariableDeclaration(path) {
                let comments = path.node.leadingComments || [];
                if (path.parentPath.isExportDeclaration()) {
                    comments = path.parent.leadingComments || [];
                }
                let tags = comments
                    .map((comment) => parseComment(`/*${comment.value}*/`))
                    .filter(Boolean)
                    .reduce((list, comment) => {
                        if (comment.tags) {
                            list.push(...comment.tags);
                        }
                        return list;
                    }, []);
                let isNamespace = tags.some((tag) => tag.tagName.text.toLowerCase() === 'namespace');
                if (!isNamespace) {
                    return;
                }
                let declarations = path.get('declarations');
                if (!declarations || declarations.length > 1) {
                    return;
                }
                let variableNode = declarations[0];
                let initializer = variableNode.get('init');
                if (!initializer || !initializer.isObjectExpression()) {
                    return;
                }
                let declaration = types.tsModuleDeclaration(variableNode.node.id, types.tsModuleBlock(
                    initializer.get('properties').map((prop) =>
                        types.exportNamedDeclaration(
                            types.variableDeclaration('const', [
                                types.variableDeclarator(prop.node.key, prop.node.value)
                            ]),
                            []
                        )
                    )
                ));
                declaration.leadingComments = path.node.leadingComments;
                path.replaceWith(declaration);
            },
        },
    };
}