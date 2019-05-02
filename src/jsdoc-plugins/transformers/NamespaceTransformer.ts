import { parseComment } from '../../helpers/ast';

export function NamespaceTransformer({ types }) {
    return {
        name: 'jsdoc-transform-namespace',
        visitor: {
            VariableDeclaration(path) {
                let tags = (path.node.leadingComments || [])
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
                let isNamespace = tags.some((tag) => tag.tagName.text.toLowerCase() === 'namespace');
                if (!isNamespace) {
                    return;
                }
                if (path.get('declarations').length > 1) {
                    return;
                }
                let variableNode = path.get('declarations')[0];
                let initializer = variableNode.init;
                if (!initializer || !initializer.isObjectExpression()) {
                    return;
                }
                let declaration = types.tsModuleDeclaration(variableNode.id, types.tsModuleBlock(
                    initializer.properties.map((prop) =>
                        types.exportNamedDeclaration(
                            types.variableDeclaration('const', [
                                types.variableDeclarator(prop.key, prop.value)
                            ])
                        )
                    )
                ));
                path.replaceWith(declaration);
            },
        },
    };
}