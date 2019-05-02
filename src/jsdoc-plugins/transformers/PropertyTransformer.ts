import { parseComment, parseType, parseTypeExpression } from '../../helpers/ast';

export function PropertyTransformer({ types }) {
    function getProperties(path) {
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
            }, [])
            .filter((tag) => tag.tagName && ['property', 'prop'].includes(tag.tagName.escapedText.toLowerCase()));
        let properties = {};
        tags.forEach((tag) => {
            let match = tag.comment.match(/(?:(\{.*?\})\s+)?(\[)?([^\{\}\s\]]+)\]?(?:\s+(.*))?/);
            if (!match) {
                return;
            }
            properties[match[3]] = {
                name: match[3],
                type: match[1] ? match[1].substring(1, match[1].length - 1) : null,
                optional: !!match[2],
            };
        });
        return properties;
    }

    return {
        name: 'jsdoc-transform-properties',
        visitor: {
            ClassDeclaration(path) {
                let properties = getProperties(path);
                let body = path.get('body');
                let classGetters = body.get('body').filter((path) => path.isClassMethod() && (path.node.kind === 'get' || path.node.kind === 'set'));
                let classProperties = body.get('body').filter((path) => path.isClassProperty());
                Object.keys(properties)
                    .reverse()
                    .forEach((propName) => {
                        let desc = properties[propName];
                        let prop = classProperties.find((prop) => prop.node.key.name === propName) ||
                            classGetters.find((prop) => prop.node.key.name === propName) ||
                            types.classProperty(types.identifier(desc.name), undefined, desc.type ? parseType(desc.type) : undefined);
                        let node = prop.node || prop;
                        if (desc.type) {
                            if (!node.typeAnnotation) {
                                node.typeAnnotation = parseType(desc.type);
                            }
                            if (node.type === 'ClassMethod') {
                                if (!node.returnType) {
                                    node.returnType = parseType(desc.type);
                                }
                            }
                        }
                        if (!node.accessibility) {
                            node.accessibility = 'public';
                        }
                        if (desc.optional) {
                            node.optional = true;
                        }
                        if (!prop.parent) {
                            body.unshiftContainer('body', prop);
                        }
                    });
            },
            VariableDeclaration(path) {
                let declarations = path.get('declarations');
                let declaration = declarations[0];
                if (declarations.length > 1 || !declaration.get('init') || !declaration.get('init').isObjectExpression()) {
                    return;
                }
                let body = declaration.get('init');
                let objProperties = body.get('properties');
                let properties = getProperties(path);
                Object.keys(properties)
                    .reverse()
                    .filter((propName) => !objProperties.some((prop) => prop.node.key.name === propName))
                    .forEach((propName) => {
                        let desc = properties[propName];
                        let prop = types.objectProperty(types.identifier(desc.name), desc.type ? types.tsAsExpression(types.identifier('undefined'), types.tsParenthesizedType(parseTypeExpression(desc.type))) : types.identifier('undefined'));
                        body.unshiftContainer('properties', prop);
                    });
            },
            TSModuleDeclaration(path) {
                let properties = getProperties(path);
                let body = path.get('body');
                let declarations = body.get('body')
                    .reduce((list, exportDecl) => {
                        let decl = exportDecl.get('declaration');
                        if (decl.isVariableDeclaration()) {
                            list.push(...decl.get('declarations'));
                        } else {
                            list.push(decl);
                        }
                        return list;
                    }, []);
                Object.keys(properties)
                    .reverse()
                    .forEach((propName) => {
                        let desc = properties[propName];
                        let prop = declarations.find((prop) => prop.node.id.name === propName) ||
                            types.variableDeclarator(types.identifier(desc.name));
                        let node = prop.node || prop;
                        if (desc.type) {
                            if (!node.id.typeAnnotation) {
                                node.id.typeAnnotation = parseType(desc.type);
                            }
                        }
                        if (!prop.parent) {
                            body.unshiftContainer('body',
                                types.exportNamedDeclaration(
                                    types.variableDeclaration('var', [prop]),
                                    []
                                )
                            );
                        }
                    });
            },
        },
    };
}