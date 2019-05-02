import { parseComment, convertType } from '../../helpers/ast';

export function ThisTransformer({ types }) {
    function transform(path, comments) {
        let tags = comments
            .map((comment) => parseComment(`/*${comment.value}*/`))
            .filter(Boolean)
            .reduce((list, comment) => {
                if (comment.tags) {
                    list.push(...comment.tags);
                }
                return list;
            }, []);
        let thisTag = tags.find((tag) => tag.tagName && tag.tagName.text.toLowerCase() === 'this');
        if (!thisTag || !thisTag.typeExpression) {
            return;
        }
        let id = types.identifier('this');
        id.typeAnnotation = convertType(thisTag.typeExpression.type);
        path.unshiftContainer('params', id);
    }
    return {
        name: 'jsdoc-transform-this',
        visitor: {
            FunctionDeclaration(path) {
                let comments;
                let parentPath = path;
                while (!parentPath.isProgram() && !comments) {
                    if (parentPath.node.leadingComments) {
                        comments = parentPath.node.leadingComments;
                    }
                    parentPath = parentPath.parentPath;
                }
                if (!comments) {
                    return;
                }
                transform(path, comments);
            },
            ClassMethod(path) {
                let comments = path.node.leadingComments;
                if (!comments) {
                    return;
                }
                transform(path, comments);
            },
            FunctionExpression(path) {
                let comments;
                let parentPath = path;
                while (!parentPath.isProgram() && !comments) {
                    if (parentPath.node.leadingComments) {
                        comments = parentPath.node.leadingComments;
                    }
                    parentPath = parentPath.parentPath;
                }
                if (!comments) {
                    return;
                }
                transform(path, comments);
            },
            ArrowFunctionExpression(path) {
                let comments;
                let parentPath = path;
                while (!parentPath.isProgram() && !comments) {
                    if (parentPath.node.leadingComments) {
                        comments = parentPath.node.leadingComments;
                    }
                    parentPath = parentPath.parentPath;
                }
                if (!comments) {
                    return;
                }
                transform(path, comments);
            },
        },
    };
}