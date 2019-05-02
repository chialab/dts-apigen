export function ImportTransformer({ types }) {
    const transform = (path) => {
        const source = path.get('source');
        if (source && source.type === 'StringLiteral') {
            let value = source.node.value;
            value = value.replace(/\.[^\/\\]*$/, '');
            source.replaceWith(
                types.stringLiteral(value)
            );
        }
    };

    return {
        name: 'jsdoc-transform-import',
        visitor: {
            ImportDeclaration: transform,
            ExportDeclaration: transform,
        },
    };
}