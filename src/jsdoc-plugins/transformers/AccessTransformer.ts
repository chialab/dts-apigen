import { parseComment } from '../../helpers/ast';

export function AccessTransformer({ types }) {
    const transformer = (path) => {
        let tags = (path.node.leadingComments || [])
            .map((comment) => parseComment(`/*${comment.value}*/`))
            .filter(Boolean)
            .reduce((list, comment) => {
                if (comment.tags) {
                    list.push(...comment.tags);
                }
                return list;
            }, []);
        let isReadOnly = tags.some((tag) => ['readonly'].includes(tag.tagName.text.toLowerCase()));
        let isPublic = tags.some((tag) => ['public'].includes(tag.tagName.text.toLowerCase()));
        let isPrivate = tags.some((tag) => ['private'].includes(tag.tagName.text.toLowerCase()));
        let isProtected = tags.some((tag) => ['protected'].includes(tag.tagName.text.toLowerCase()));
        let access = tags.find((tag) => ['access'].includes(tag.tagName.text.toLowerCase()));
        if (isReadOnly) {
            path.node.readonly = true;
        }
        if (isPublic) {
            path.node.access = path.node.accessibility = 'public';
        } else if (isPrivate) {
            path.node.access = path.node.accessibility = 'private';
        } else if (isProtected) {
            path.node.access = path.node.accessibility = 'protected';
        } else if (access && ['private', 'protected', 'public'].includes(access.comment.trim().toLowerCase())) {
            path.node.access = path.node.accessibility = access.comment;
        }
    };
    return {
        name: 'jsdoc-transform-access',
        visitor: {
            ClassDeclaration(path) {
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
                let isAbastract = tags.some((tag) => ['abstract', 'virtual'].includes(tag.tagName.text.toLowerCase()));
                if (!isAbastract) {
                    return;
                }
                path.node.abstract = true;
            },
            ClassProperty: transformer,
            ClassMethod: transformer,
        },
    };
}