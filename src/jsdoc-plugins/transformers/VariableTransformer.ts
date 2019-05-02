import { parseComment } from '../../helpers/ast';

export function VariableTransformer({ types }) {
    return {
        name: 'jsdoc-transform-var',
        visitor: {
            VariableDeclaration(path) {
                let comments = [];
                if (path.node.leadingComments) {
                    comments = path.node.leadingComments;
                } else if (path.parentPath.isExportDeclaration()) {
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
                let isConstants = tags.some((tag) => {
                    let tagName = tag.tagName.text.toLowerCase();
                    let value = (tag.comment || '').trim().toLowerCase();
                    if (['const', 'constant'].includes(tagName)) {
                        return true;
                    }
                    if (tagName === 'kind' || (value === 'const' || value === 'constant')) {
                        return true;
                    }
                });
                if (!isConstants) {
                    return;
                }
                path.node.kind = 'const';
            },
        },
    };
}