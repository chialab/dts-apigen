import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { SourceFile, SyntaxKind, ClassDeclaration, InterfaceDeclaration, TypeAliasDeclaration, FunctionDeclaration, VariableDeclaration, ModuleDeclaration, TypeNode, isClassDeclaration, isInterfaceDeclaration, isTypeAliasDeclaration, isFunctionDeclaration, isVariableStatement, isVariableDeclaration, isModuleDeclaration, isImportDeclaration, isExportDeclaration, isNamespaceExportDeclaration, isExportAssignment, isImportEqualsDeclaration, isTypeReferenceNode, isUnionTypeNode, isArrayTypeNode, isParenthesizedTypeNode, Node, isTypeLiteralNode, TypeElement, isIndexSignatureDeclaration, TypeParameterDeclaration, createNodeArray, isPropertySignature, isIntersectionTypeNode, isFunctionTypeNode, ParameterDeclaration, isMethodSignature, isConstructSignatureDeclaration, isTypeParameterDeclaration, isTypeQueryNode, isExpressionWithTypeArguments, isPropertyDeclaration, isMethodDeclaration, PropertyDeclaration, MethodDeclaration, isIndexedAccessTypeNode, isLiteralTypeNode, isConstructorTypeNode, Statement, NodeArray, Identifier, isTupleTypeNode, isImportTypeNode, isTypePredicateNode, JSDocTag, isEnumDeclaration, EnumDeclaration, createPrinter, EmitHint, isTypeOperatorNode, isConstructorDeclaration, isCallSignatureDeclaration } from 'typescript';
import { ensureFile } from '../helpers/fs';
import { getJSDocParamDescription, getJSDocReturnDescription, getJSDocDescription, getJSDocExamples, getJSDocSeeLinks, JSDocSeeTag, getJSDocTagByName } from '../helpers/ast';
import { TemplateOptions } from './index';

type MarkdownTemplateOptions = TemplateOptions & {
    mode: 'module' | 'files';
    header?: string;
    footer?: string;
}

type FunctionDeclarations = { [key: string]: FunctionDeclaration[] };

const BADGES = {
    'module': '<code>module</code> ',
    'namespace': '<code>namespace</code> ',
    'method': '<code>method</code> ',
    'class': '<code>class</code> ',
    'constant': '<code>constant</code> ',
    'enum': '<code>enum</code> ',
    'type': '<code>type</code> ',
};

function nameToString(node: Node): string {
    let id = (node as any).name;
    if (isTypeReferenceNode(node)) {
        id = node.typeName;
    } else if (isTypeQueryNode(node)) {
        id = node.exprName;
    } else if (isExpressionWithTypeArguments(node)) {
        id = node.expression;
    } else if (isLiteralTypeNode(node)) {
        id = node.literal;
    } else if (isImportTypeNode(node)) {
        id = node.qualifier;
    }
    return id.escapedText || id.getText();
}

function nameToId(node: Node): string {
    return nameToString(node)
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

function nameToFile(node: Node): string {
    if (isFunctionDeclaration(node)) {
        return `method.${nameToId(node)}.md`;
    } else if (isVariableDeclaration(node)) {
        return `constant.${nameToId(node)}.md`;
    } else if (isEnumDeclaration(node)) {
        return `enum.${nameToId(node)}.md`;
    } else if (isInterfaceDeclaration(node) || isTypeAliasDeclaration(node)) {
        return `type.${nameToId(node)}.md`;
    } else if (isClassDeclaration(node)) {
        return `class.${nameToId(node)}.md`;
    } else if (isModuleDeclaration(node)) {
        return `namespace.${nameToId(node)}.md`;
    }
}

function toLink(node: Node, options: MarkdownTemplateOptions): string {
    if (options.mode === 'files') {
        return `<a href="${nameToFile(node)}">${nameToString(node)}</a>`;
    }
    return `<a href="#${nameToId(node)}">${nameToString(node)}</a>`;
}

function collectReferences(statements: NodeArray<Statement>) {
    const namespaces: ModuleDeclaration[] = [];
    const classes: ClassDeclaration[] = [];
    const methods: FunctionDeclarations = {};
    const constants: VariableDeclaration[] = [];
    const enums: EnumDeclaration[] = [];
    const types: Array<TypeAliasDeclaration|InterfaceDeclaration> = [];
    const references: Node[] = [];

    statements.forEach((node) => {
        if (isClassDeclaration(node)) {
            classes.push(node);
            references.push(node);
        } else if (isInterfaceDeclaration(node)) {
            types.push(node);
            references.push(node);
        } else if (isTypeAliasDeclaration(node)) {
            types.push(node);
            references.push(node);
        } else if (isFunctionDeclaration(node)) {
            let name = nameToString(node);
            methods[name] = methods[name] || [];
            methods[name].push(node);
            references.push(node);
        } else if (isEnumDeclaration(node)) {
            enums.push(node);
            references.push(node);
        } else if (isVariableStatement(node)) {
            constants.push(...node.declarationList.declarations);
            references.push(...node.declarationList.declarations);
        } else if (isVariableDeclaration(node)) {
            constants.push(node);
            references.push(node);
        } else if (isModuleDeclaration(node)) {
            namespaces.push(node);
            references.push(node);
        } else if (isImportDeclaration(node) || isExportDeclaration(node) || isNamespaceExportDeclaration(node) || isExportAssignment(node) || isImportEqualsDeclaration(node)) {
            // ignore
        } else {
            console.log('unhandled node type:', node.kind, SyntaxKind[node.kind], `in ${node.getSourceFile().fileName}`);
        }
    });

    return {
        namespaces,
        classes,
        methods,
        constants,
        enums,
        types,
        references,
    }
}

function renderSamples(tags: JSDocTag[]) {
    return tags
        .map((tag) => tag.comment)
        .join('\n\n')
        .replace(/</g, '&lt;')
        .replace(/＠/g, '@');
}

function renderSeeAlso(tags: JSDocSeeTag[], references, options) {
    return tags
        .map((tag) => {
            let interpolated = tag.interpolated;
            return interpolated
                .map((chunk) => {
                    if (typeof chunk === 'string') {
                        return chunk;
                    }
                    let node = references.find((node) => nameToString(node) === chunk.reference);
                    if (node) {
                        return toLink(node, options);
                    }
                    return `[${chunk.text}](${chunk.reference})`;
                })
                .join('');
        })
        .map((text) => `* ${text}`)
        .join('\n\n');
}

function renderInfo(node: Node) {
    let deprecated = getJSDocTagByName(node, 'deprecated');
    let since = getJSDocTagByName(node, 'since');
    if (!deprecated && !since) {
        return '';
    }
    let message = '';
    if (deprecated) {
        message += `**Deprecated** ${deprecated.comment || ''}  \n`;
    }
    if (since && since.comment) {
        message += `**Since** ${since.comment}  \n`;
    }
    return `${message}`;
}

function collapseContent(content: string): string {
    return `<details>
${content.replace(/<strong([^>]*)>/i, '<summary><strong$1>').replace('</strong>', '</strong></summary><br />')}
</details>`;
}

function renderType(type: TypeNode|TypeElement|TypeParameterDeclaration, references: (TypeAliasDeclaration|InterfaceDeclaration)[], options: MarkdownTemplateOptions): string {
    if (isTypeReferenceNode(type)) {
        let name = nameToString(type);
        let linked = references.find((item) => nameToString(item) === name);
        return `${linked ? toLink(linked, options) : name}${type.typeArguments ? `&lt;${type.typeArguments.map((arg) => renderType(arg, references, options)).join(', ')}&gt;` : ''}`;
    }
    if (isUnionTypeNode(type)) {
        return type.types.map((type) => renderType(type, references, options)).join('|');
    }
    if (isIntersectionTypeNode(type)) {
        return type.types.map((type) => renderType(type, references, options)).join(' & ');
    }
    if (isArrayTypeNode(type)) {
        return `${renderType(type.elementType, references, options)}[]`;
    }
    if (isParenthesizedTypeNode(type)) {
        return `(${renderType(type.type, references, options)})`;
    }
    if (isTypeLiteralNode(type)) {
        return `{
${type.members.map((member) => `${renderType(member, references, options).replace(/^(.)/gm, '    $1')};`).join('\n')}
}`;
    }
    if (isIndexSignatureDeclaration(type)) {
        let param = type.parameters[0];
        return `[${nameToString(param)}: ${renderType(param.type, references, options)}]: ${renderType(type.type, references, options)}`;
    }
    if (isPropertySignature(type)) {
        return `${nameToString(type)}${type.questionToken ? '?' : ''}: ${renderType(type.type, references, options)}`;
    }
    if (isFunctionTypeNode(type)) {
        let typeParams = '';
        if (type.typeParameters) {
            typeParams += `&lt;${type.typeParameters.map((param) => renderType(param, references, options)).join(', ')}&gt;`;
        }
        return `${typeParams}(${
            type.parameters.map((param) => `${nameToString(param)}${param.questionToken ? '?' : ''}: ${renderType(param.type, references, options)}`).join(', ')
        }): ${renderType(type.type, references, options)}`;
    }
    if (isMethodSignature(type)) {
        let typeParams = '';
        if (type.typeParameters) {
            typeParams += `&lt;${type.typeParameters.map((param) => renderType(param, references, options)).join(', ')}&gt;`;
        }
        return `${nameToString(type)}${typeParams}(${
            type.parameters.map((param) => `${nameToString(param)}${param.questionToken ? '?' : ''}: ${renderType(param.type, references, options)}`).join(', ')
        }): ${renderType(type.type, references, options)}`;
    }
    if (isCallSignatureDeclaration(type)) {
        let typeParams = '';
        if (type.typeParameters) {
            typeParams += `&lt;${type.typeParameters.map((param) => renderType(param, references, options)).join(', ')}&gt;`;
        }
        return `${typeParams}(${type.parameters.map((param) => `${nameToString(param)}${param.questionToken ? '?' : ''}: ${renderType(param.type, references, options)}`).join(', ')}): ${renderType(type.type, references, options)}`;
    }
    if (isConstructSignatureDeclaration(type)) {
        return `constructor(${
            type.parameters.map((param) => `${nameToString(param)}${param.questionToken ? '?' : ''}: ${renderType(param.type, references, options)}`).join(', ')
        }): ${renderType(type.type, references, options)}`;
    }
    if (isTypeQueryNode(type)) {
        let name = nameToString(type);
        let linked = references.find((item) => nameToString(item) === name);
        return `${linked ? toLink(linked, options) : name}`;
    }
    if (isTypeParameterDeclaration(type)) {
        return `${nameToString(type)}${type.constraint ? ` extends ${renderType(type.constraint, references, options)}` : ''}`;
    }
    if (isExpressionWithTypeArguments(type)) {
        let name = nameToString(type);
        let linked = references.find((item) => nameToString(item) === name);
        return `${linked ? toLink(linked, options) : name}`;
    }
    if (isIndexedAccessTypeNode(type)) {
        return `${renderType(type.objectType, references, options)}[${renderType(type.indexType, references, options)}]`;
    }
    if (isTupleTypeNode(type)) {
        return `[${type.elements.map((t) => renderType(t, references, options)).join(', ')}]`;
    }
    if (isLiteralTypeNode(type)) {
        return nameToString(type);
    }
    if (isConstructorTypeNode(type)) {
        return `constructor(${
            type.parameters.map((param) => `${nameToString(param)}${param.questionToken ? '?' : ''}: ${renderType(param.type, references, options)}`).join(', ')
        }): ${renderType(type.type, references, options)}`;
    }
    if (isImportTypeNode(type)) {
        let name = nameToString(type);
        let linked = references.find((item) => nameToString(item) === name);
        return `${linked ? toLink(linked, options) : name}`;
    }
    if (isTypePredicateNode(type)) {
        let name = nameToString(type.type);
        let linked = references.find((item) => nameToString(item) === name);
        return `${type.parameterName.getText()} is ${linked ? toLink(linked, options) : name}`;
    }
    if (isTypeOperatorNode(type)) {
        let operator;
        switch (type.operator) {
            case SyntaxKind.KeyOfKeyword:
                operator = 'keyof';
                break;
            case SyntaxKind.UniqueKeyword:
                operator = 'unique';
                break;
            case SyntaxKind.ReadonlyKeyword:
                operator = 'readonly';
                break;
        }
        return `${operator} ${renderType(type.type, references, options)}`;
    }
    switch (type.kind) {
        case SyntaxKind.NumberKeyword:
            return 'number';
        case SyntaxKind.StringKeyword:
            return 'string';
        case SyntaxKind.JSDocAllType:
        case SyntaxKind.AnyKeyword:
        case SyntaxKind.UnknownKeyword:
            return 'any';
        case SyntaxKind.VoidKeyword:
            return 'void';
        case SyntaxKind.NullKeyword:
            return 'null';
        case SyntaxKind.UndefinedKeyword:
            return 'undefined';
        case SyntaxKind.BooleanKeyword:
            return 'boolean';
        case SyntaxKind.ObjectKeyword:
            return 'Object';
        case SyntaxKind.SymbolKeyword:
            return 'Symbol';
    }
    console.log('unhandled type kind:', type.kind, SyntaxKind[type.kind]);
}

function generateSummary(namespaces: ModuleDeclaration[], classes: ClassDeclaration[], methods: { [key: string]: FunctionDeclaration[] }, constants: VariableDeclaration[], enums: EnumDeclaration[], types: Array<TypeAliasDeclaration | InterfaceDeclaration>, references, options: MarkdownTemplateOptions) {
    let methodsList = Object.values(methods);

    return `
${namespaces.length ? `
**Namespaces**

${namespaces.map((ns) => toLink(ns, options)).join(', ')}` : ''}

${classes.length ? `
**Classes**

${classes.map((clazz) => toLink(clazz, options)).join(', ')}` : ''}

${methodsList.length ? `
**Methods**

${methodsList.map((methodDeclarationList) => toLink(methodDeclarationList[0], options)).join(', ')}` : ''}

${constants.length ? `
**Constants**

${constants.map((constant) => toLink(constant, options)).join(', ')}` : ''}

${enums.length ? `
**Enums**

${enums.map((enumDecl) => toLink(enumDecl, options)).join(', ')}` : ''}

${types.length ? `
**Types**

${types.map((type) => toLink(type, options)).join(', ')}` : ''}
`;
}

function generateModule(statements: NodeArray<Statement>, globalRefs, options, collapse) {
    let members = collectReferences(statements);
    let references = [...globalRefs, ...members.references];

    let content = generateSummary(
        members.namespaces,
        members.classes,
        members.methods,
        members.constants,
        members.enums,
        members.types,
        references,
        options,
    );

    members.namespaces.forEach((ns) => {
        let nsContent = generateNamespace(ns, references, options);
        if (options.mode === 'files') {
            let outFile = join(dirname(options.out), nameToFile(ns));
            ensureFile(outFile);
            writeFileSync(outFile, nsContent);
        } else {
            content += `\n\n<hr />\n\n${collapse ? collapseContent(nsContent) : nsContent}`;
        }
    });

    members.classes.forEach((clazz) => {
        let clazzContent = generateClass(clazz, references, options);
        if (options.mode === 'files') {
            let outFile = join(dirname(options.out), nameToFile(clazz));
            ensureFile(outFile);
            writeFileSync(outFile, clazzContent);
        } else {
            content += `\n\n<hr />\n\n${collapse ? collapseContent(clazzContent) : clazzContent}`;
        }
    });

    Object.values(members.methods).forEach((methodDeclarationList) => {
        let methodContent = generateMethod(methodDeclarationList, references, options);
        if (options.mode === 'files') {
            let outFile = join(dirname(options.out), nameToFile(methodDeclarationList[0]));
            ensureFile(outFile);
            writeFileSync(outFile, methodContent);
        } else {
            content += `\n\n<hr />\n\n${collapse ? collapseContent(methodContent) : methodContent}`;
        }
    });

    members.constants
        .filter((constant) => {
            if (!constant.initializer) {
                return true;
            }
            let name = (constant.initializer as any).name as Identifier;
            if (!name) {
                return true;
            }
            return !globalRefs.some((ref) => nameToString(ref) === name.getText())
        })
        .forEach((constant) => {
            let variableContent = generateConstant(constant, references, options);
            if (options.mode === 'files') {
                let outFile = join(dirname(options.out), nameToFile(constant));
                ensureFile(outFile);
                writeFileSync(outFile, variableContent);
            } else {
                content += `\n\n<hr />\n\n${collapse ? collapseContent(variableContent) : variableContent}`;
            }
        });
    
    members.enums
        .forEach((enumDecl) => {
            let variableContent = generateEnum(enumDecl, references, options);
            if (options.mode === 'files') {
                let outFile = join(dirname(options.out), nameToFile(enumDecl));
                ensureFile(outFile);
                writeFileSync(outFile, variableContent);
            } else {
                content += `\n\n<hr />\n\n${collapse ? collapseContent(variableContent) : variableContent}`;
            }
        });

    members.types.forEach((type) => {
        let typeContent = generateType(type, references, options);
        if (options.mode === 'files') {
            let outFile = join(dirname(options.out), nameToFile(type));
            ensureFile(outFile);
            writeFileSync(outFile, typeContent);
        } else {
            content += `\n\n<hr />\n\n${collapse ? collapseContent(typeContent) : typeContent}`;
        }
    });

    return content;
}

function generateNamespace(ns: ModuleDeclaration, references, options) {
    let description = getJSDocDescription(ns);
    return `<strong id="${nameToId(ns)}">${BADGES.namespace} ${nameToString(ns)}</strong>

${renderInfo(ns)}

${description ? `<p>

${description.trim()}

</p>` : ''}

${generateModule((ns.body as any).statements, references || [], options, true)}`;
}

function generateSource(source: SourceFile, options) {
    return generateModule(source.statements, [], options, false);
}

function generateClass(clazz: ClassDeclaration, references, options) {
    let description = getJSDocDescription(clazz);
    let samples = getJSDocExamples(clazz);
    let seeAlso = getJSDocSeeLinks(clazz);
    let instanceProperties: PropertyDeclaration[] = [];
    let staticProperties: PropertyDeclaration[] = [];
    clazz.members
        .filter((member) => isPropertyDeclaration(member))
        .map((member) => member as PropertyDeclaration)
        .forEach((member) => {
            if (member.modifiers && member.modifiers.some((mod) => mod.kind === SyntaxKind.PrivateKeyword)) {
                // skip private members
                return;
            }
            if (member.modifiers && member.modifiers.some((mod) => mod.kind === SyntaxKind.StaticKeyword)) {
                staticProperties.push(member);
            } else {
                instanceProperties.push(member);
            }
        });
    let instanceMethods: { [key: string]: MethodDeclaration[] } = {
        __proto__: null,
    };
    let staticMethods: { [key: string]: MethodDeclaration[] } = {
        __proto__: null,
    };
    clazz.members
        .filter((member) => isMethodDeclaration(member) || isConstructorDeclaration(member))
        .map((member) => member as MethodDeclaration)
        .forEach((member) => {
            if (member.modifiers && member.modifiers.some((mod) => mod.kind === SyntaxKind.PrivateKeyword)) {
                // skip private members
                return;
            }
            let name = isConstructorDeclaration(member) ? 'constructor' : nameToString(member);
            if (member.modifiers && member.modifiers.some((mod) => mod.kind === SyntaxKind.StaticKeyword)) {
                staticMethods[name] = staticMethods[name] || [];
                staticMethods[name].push(member);
            } else {
                instanceMethods[name] = instanceMethods[name] || [];
                instanceMethods[name].push(member);
            }
        });
    return `<strong id="${nameToId(clazz)}">${BADGES.class} ${nameToString(clazz)}</strong>
    
${renderInfo(clazz)}

${clazz.heritageClauses && clazz.heritageClauses.length ? `<strong>Extends:</strong> ${renderType(clazz.heritageClauses[0].types[0], references, options)}` : ''}

${description ? `<p>

${description.trim()}

</p>` : ''}

${samples.length ? `<strong>Examples</strong>

${renderSamples(samples)}` : ''}

${instanceProperties.length ? `<strong>Properties</strong>

<table>
    <thead>
        <th align="left">Name</th>
        <th align="left">Type</th>
        <th align="center">Readonly</th>
        <th align="left">Description</th>
    </thead>
    <tbody>
        <tr>${instanceProperties.map((prop) => `
            <td>${nameToString(prop)}</td>
            <td><code>${renderType(prop.type, references, options)}</code></td>
            <td align="center">${prop.modifiers && prop.modifiers.some((mod) => mod.kind === SyntaxKind.ReadonlyKeyword) ? '✓' : ''}</td>
            <td>${getJSDocDescription(prop) || ''}</td>`).join('</tr>\n<tr>')}
        </tr>
    </tbody>
</table>
` : ''}

${Object.keys(instanceMethods).length ? `<strong>Methods</strong>

${Object.values(instanceMethods).map((methodList) => generateMethod(methodList, references, options)).join('\n<br />\n\n')}
`: ''}

${staticProperties.length ? `<strong>Static properties</strong>

<table>
    <thead>
        <th align="left">Name</th>
        <th align="left">Type</th>
        <th align="left">Readonly</th>
        <th align="left">Description</th>
    </thead>
    <tbody>
        <tr>${staticProperties.map((prop) => `
            <td>${nameToString(prop)}</td>
            <td><code>${renderType(prop.type, references, options)}</code></td>
            <td align="center">${prop.modifiers && prop.modifiers.some((mod) => mod.kind === SyntaxKind.ReadonlyKeyword) ? '✓' : ''}</td>
            <td>${getJSDocDescription(prop) || ''}</td>`).join('</tr>\n<tr>')}
        </tr>
    </tbody>
</table>
` : ''}

${Object.keys(staticMethods).length ? `<strong>Static methods</strong>

${Object.values(staticMethods).map((methodList) => generateMethod(methodList, references, options)).join('\n<br />\n\n')}
`: ''}

${seeAlso.length ? `<strong>See also</strong>

${renderSeeAlso(seeAlso, references, options)}` : ''}
`;
}

function generateMethod(methodDeclarationList: (FunctionDeclaration | MethodDeclaration)[], references, options: MarkdownTemplateOptions) {
    let firstDeclaration = methodDeclarationList[0];
    let name = isConstructorDeclaration(firstDeclaration) ? 'constructor' : nameToString(firstDeclaration);
    let description = getJSDocDescription(firstDeclaration);
    let samples = getJSDocExamples(firstDeclaration);
    let seeAlso = getJSDocSeeLinks(firstDeclaration);
    let returnDescription = getJSDocReturnDescription(firstDeclaration);
    return `<strong${isConstructorDeclaration(firstDeclaration) ? '' : ` id="${nameToId(firstDeclaration)}"`}>${BADGES.method} ${name}</strong>

${renderInfo(firstDeclaration)}

${description ? `<p>

${description.trim()}

</p>` : ''}

${methodDeclarationList.map((method) => `<details>
<summary>
<code>${method.typeParameters ? `&lt;${method.typeParameters.map((param) => renderType(param, references, options)).join(', ')}&gt;` : ''}(${method.parameters.map((param) => `${nameToString(param)}${param.questionToken ? '?' : ''}: ${renderType(param.type, references, options)}`).join(', ')})${method.type ? `: ${renderType(method.type, references, options)}` : ''}</code>
</summary><br />

${method.typeParameters && method.typeParameters.length ? `<strong>Type params</strong>

<table>
    <thead>
        <th align="left">Name</th>
        <th align="left">Type</th>
    </thead>
    <tbody>
        <tr>${method.typeParameters.map((param) => `
            <td>${nameToString(param)}</td>
            <td><code>extends ${renderType(param.constraint, references, options)}</code></td>`)
                .join('</tr>\n<tr>')}
        </tr>
    </tbody>
</table>` : ''}

${method.parameters.length ? `<strong>Params</strong>

<table>
    <thead>
        <th align="left">Name</th>
        <th align="left">Type</th>
        <th align="center">Optional</th>
        <th align="left">Description</th>
    </thead>
    <tbody>
        <tr>${method.parameters.map((param) => `
            <td>${nameToString(param)}</td>
            <td><code>${renderType(param.type, references, options)}</code></td>
            <td align="center">${param.questionToken ? '✓' : ''}</td>
            <td>${getJSDocParamDescription(firstDeclaration, nameToString(param)) || ''}</td>`)
                .join('</tr>\n<tr>')}
        </tr>
    </tbody>
</table>` : ''}

${method.type ? `<strong>Returns</strong>: <code>${renderType(method.type, references, options).replace(/\n/g, ' ')}</code> ${returnDescription || ''}` : ''}

<br />
</details>`).join('\n')}

${samples.length ? `<strong>Examples</strong>

${renderSamples(samples)}` : ''}

${seeAlso.length ? `<strong>See also</strong>

${renderSeeAlso(seeAlso, references, options)}` : ''}
`;
}

function generateConstant(constant: VariableDeclaration, references, options) {
    let description = getJSDocDescription(constant) || getJSDocDescription(constant.parent.parent);
    let samples = getJSDocExamples(constant);
    let seeAlso = getJSDocSeeLinks(constant);
    return `<strong id="${nameToId(constant)}">${BADGES.constant} ${nameToString(constant)}</strong>

${renderInfo(constant)}

${description ? `<p>

${description.trim()}

</p>` : ''}

${samples.length ? `<strong>Examples</strong>

${renderSamples(samples)}` : ''}

${constant.type ? `<strong>Type:</strong>

<pre>${renderType(constant.type, references, options)}</pre>` : ''}

${seeAlso.length ? `<strong>See also</strong>

${renderSeeAlso(seeAlso, references, options)}` : ''}
`;
}

function generateEnum(enumDecl: EnumDeclaration, references, options) {
    let description = getJSDocDescription(enumDecl);
    let samples = getJSDocExamples(enumDecl);
    let seeAlso = getJSDocSeeLinks(enumDecl);
    return `<strong id="${nameToId(enumDecl)}">${BADGES.enum} ${nameToString(enumDecl)}</strong>

${renderInfo(enumDecl)}

${description ? `<p>

${description.trim()}

</p>` : ''}

${enumDecl.members.length ? `
<table>
    <thead>
        <th align="left">Member</th>
        <th align="left">Description</th>
        <th align="left">Value</th>
    </thead>
    <tbody>
        <tr>${enumDecl.members.map((member) => `
            <td>${nameToString(member)}</td>
            <td>${getJSDocDescription(member) || ''}</td>
            <td>${member.initializer ? `<code>${createPrinter().printNode(EmitHint.Unspecified, member.initializer, member.getSourceFile())}</code>` : '–'}</td>`)
                .join('</tr>\n<tr>')}
        </tr>
    </tbody>
</table>
` : ''}

${samples.length ? `<strong>Examples</strong>

${renderSamples(samples)}` : ''}

${seeAlso.length ? `<strong>See also</strong>

${renderSeeAlso(seeAlso, references, options)}` : ''}
`;
}

function generateType(type: TypeAliasDeclaration|InterfaceDeclaration, references, options) {
    let description = getJSDocDescription(type);
    let samples = getJSDocExamples(type);
    let seeAlso = getJSDocSeeLinks(type);
    let declarations;
    if (isTypeAliasDeclaration(type)) {
        declarations = renderType(type.type, references, options);
    } else {
        declarations = (type.typeParameters || createNodeArray()).map((type) => renderType(type, references, options)).join('|');
    }
    return `<strong id="${nameToId(type)}">${BADGES.type} ${nameToString(type)}</strong>

${description ? `<p>

${description.trim()}

</p>` : ''}

${samples.length ? `<strong>Examples</strong>

${renderSamples(samples)}` : ''}

<pre>${declarations}</pre>

${seeAlso.length ? `<strong>See also</strong>

${renderSeeAlso(seeAlso, references, options)}` : ''}
`;
}

export = function markdown(sourceFile: SourceFile, options: MarkdownTemplateOptions) {
    const code = `${options.header ? `${options.header}\n\n` : ''}${generateSource(sourceFile, {})}${options.footer ? `\n\n${options.footer}` : ''}`;
    ensureFile(options.out);
    writeFileSync(options.out, code);
}