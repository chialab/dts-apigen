import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { SourceFile, SyntaxKind, ClassDeclaration, InterfaceDeclaration, TypeAliasDeclaration, FunctionDeclaration, VariableDeclaration, ModuleDeclaration, TypeNode, isClassDeclaration, isInterfaceDeclaration, isTypeAliasDeclaration, isFunctionDeclaration, isVariableStatement, isVariableDeclaration, isModuleDeclaration, isImportDeclaration, isExportDeclaration, isNamespaceExportDeclaration, isExportAssignment, isImportEqualsDeclaration, isTypeReferenceNode, isUnionTypeNode, isArrayTypeNode, isParenthesizedTypeNode, Node, isTypeLiteralNode, TypeElement, isIndexSignatureDeclaration, TypeParameterDeclaration, createNodeArray, isPropertySignature, isIntersectionTypeNode, isFunctionTypeNode, ParameterDeclaration, isMethodSignature, isConstructSignatureDeclaration, isTypeParameterDeclaration, isTypeQueryNode, isExpressionWithTypeArguments, isPropertyDeclaration, isMethodDeclaration, PropertyDeclaration, MethodDeclaration, isIndexedAccessTypeNode, isLiteralTypeNode, isConstructorTypeNode, Statement, NodeArray, isSourceFile, isIdentifier, Identifier, isTupleTypeNode, isImportTypeNode, isTypePredicateNode } from 'typescript';
import { ensureFile } from '../helpers/fs';
import { getJSDocParamDescription, getJSDocReturnDescription, getJSDocDescription, getJSDocExamples, isExported } from '../helpers/ast';
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
            console.log(node)
            console.log('unhandled node type:', node.kind, SyntaxKind[node.kind], `in ${node.getSourceFile().fileName}`);
        }
    });

    return {
        namespaces,
        classes,
        methods,
        constants,
        types,
        references,
    }
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
        return `(${
            type.parameters.map((param) => `${nameToString(param)}${param.questionToken ? '?' : ''}: ${renderType(param.type, references, options)}`).join(', ')
        }): ${renderType(type.type, references, options)}`;
    }
    if (isMethodSignature(type)) {
        return `${nameToString(type)}(${
            type.parameters.map((param) => `${nameToString(param)}${param.questionToken ? '?' : ''}: ${renderType(param.type, references, options)}`).join(', ')
        }): ${renderType(type.type, references, options)}`;
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
        return `[${type.elementTypes.map((t) => renderType(t, references, options)).join(', ')}]`;
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
        let name = nameToString(type);
        let linked = references.find((item) => nameToString(item) === name);
        return `${type.parameterName.getText()} is ${linked ? toLink(linked, options) : name}`;
    }
    switch (type.kind) {
        case SyntaxKind.NumberKeyword:
            return 'number';
        case SyntaxKind.StringKeyword:
            return 'string';
        case SyntaxKind.JSDocAllType:
        case SyntaxKind.AnyKeyword:
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
    }
    console.log('unhandled type kind:', type.kind, SyntaxKind[type.kind]);
}

function generateSummary(namespaces: ModuleDeclaration[], classes: ClassDeclaration[], methods: { [key: string]: FunctionDeclaration[] }, constants: VariableDeclaration[], types: Array<TypeAliasDeclaration | InterfaceDeclaration>, references, options: MarkdownTemplateOptions) {
    classes = classes.filter((clazz) => isExported(clazz));
    constants = constants.filter((constant) => isExported(constant.parent.parent));
    types = types.filter((type) => isExported(type));
    let methodsList = Object.values(methods).filter((methodList) => isExported(methodList[0]));

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

${types.length ? `
**Types**

${types.map((type) => toLink(type, options)).join(', ')}` : ''}
`;
}

function collapseContent(content: string): string {
    return `<details>
${content.replace(/<h3([^>]*)>/i, '<summary><strong$1>').replace('</h3>', '</strong></summary><br />')}
</details>`;
}

function generateModule(statements: NodeArray<Statement>, globalRefs, options, collapse) {
    let members = collectReferences(statements);
    let references = [...globalRefs, ...members.references];

    let content = generateSummary(
        members.namespaces,
        members.classes,
        members.methods,
        members.constants,
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
    return `<h3 id="${nameToId(ns)}">${BADGES.namespace} ${nameToString(ns)}</h3>

<p>${description ? description.trim() : ''}</p>

${generateModule((ns.body as any).statements, references || [], options, false)}`;
}

function generateSource(source: SourceFile, options) {
    return generateModule(source.statements, [], options, true);
}

function generateClass(clazz: ClassDeclaration, references, options) {
    let description = getJSDocDescription(clazz);
    let samples = getJSDocExamples(clazz);
    let instanceProperties: PropertyDeclaration[] = [];
    let staticProperties: PropertyDeclaration[] = [];
    clazz.members
        .filter((member) => isPropertyDeclaration(member))
        .map((member) => member as PropertyDeclaration)
        .forEach((member) => {
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
        .filter((member) => isMethodDeclaration(member))
        .map((member) => member as MethodDeclaration)
        .forEach((member) => {
            let name = nameToString(member);
            if (member.modifiers && member.modifiers.some((mod) => mod.kind === SyntaxKind.StaticKeyword)) {
                staticMethods[name] = staticMethods[name] || [];
                staticMethods[name].push(member);
            } else {
                instanceMethods[name] = instanceMethods[name] || [];
                instanceMethods[name].push(member);
            }
        });
    return `<h3 id="${nameToId(clazz)}">${BADGES.class} ${nameToString(clazz)}</h3>

${clazz.heritageClauses && clazz.heritageClauses.length ? `<strong>Extends:</strong> ${renderType(clazz.heritageClauses[0].types[0], references, options)}` : ''}

<p>${description ? description.trim() : ''}</p>

${samples.length ? `<strong>Examples</strong>

${samples.join('\n\n').replace(/</g, '&lt;')}` : ''}

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

${Object.values(instanceMethods).map((methodList) => generateMethod(methodList, references, options)).join('\n\n')}
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

${Object.values(staticMethods).map((methodList) => generateMethod(methodList, references, options)).join('\n\n')}
`: ''}
`;
}

function generateMethod(methodDeclarationList: (FunctionDeclaration|MethodDeclaration)[], references, options: MarkdownTemplateOptions) {
    let name = nameToString(methodDeclarationList[0]);
    let description = getJSDocDescription(methodDeclarationList[0]);
    let samples = getJSDocExamples(methodDeclarationList[0]);
    return `<h3 id="${nameToId(methodDeclarationList[0])}">${BADGES.method} ${name}</h3>

<p>${description ? description.trim() : ''}</p>

${methodDeclarationList.map((method) => `<details>
<summary>
<code>(${method.parameters.map((param) => `${nameToString(param)}${param.questionToken ? '?' : ''}: ${renderType(param.type, references, options)})`).join(', ')}): ${renderType(method.type, references, options)}</code>
</summary><br />

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
            <td>${getJSDocParamDescription(methodDeclarationList[0], nameToString(param)) || ''}</td>`)
                .join('</tr>\n<tr>')}` : ''}
        </tr>
    </tbody>
</table>

<strong>Returns</strong>: <code>${renderType(method.type, references, options).replace(/\n/g, ' ')}</code> ${getJSDocReturnDescription(methodDeclarationList[0]) || ''}

</details>`).join('\n')}

${samples.length ? `<strong>Examples</strong>

${samples.join('\n\n')}` : ''}
`;
}

function generateConstant(constant: VariableDeclaration, references, options) {
    let description = getJSDocDescription(constant) || getJSDocDescription(constant.parent.parent);
    let samples = getJSDocExamples(constant);
    return `<h3 id="${nameToId(constant)}">${BADGES.constant} ${nameToString(constant)}</h3>

<p>${description ? description.trim() : ''}</p>

${samples.length ? `<strong>Examples</strong>

${samples.join('\n\n')}` : ''}

${constant.type ? `<strong>Type:</strong>

<pre>${renderType(constant.type, references, options)}</pre>` : ''}
`;
}

function generateType(type: TypeAliasDeclaration|InterfaceDeclaration, references, options) {
    let description = getJSDocDescription(type);
    let samples = getJSDocExamples(type);
    let declarations;
    if (isTypeAliasDeclaration(type)) {
        declarations = renderType(type.type, references, options);
    } else {
        declarations = (type.typeParameters || createNodeArray()).map((type) => renderType(type, references, options)).join('|');
    }
    return `<h3 id="${nameToId(type)}">${BADGES.type} ${nameToString(type)}</h3>

<p>${description ? description.trim() : ''}</p>

${samples.length ? `<strong>Examples</strong>

${samples.join('\n\n')}` : ''}

<pre>${declarations}</pre>
`;
}

export = function markdown(sourceFile: SourceFile, options: MarkdownTemplateOptions) {
    const code = `${options.header ? `${options.header}\n\n` : ''}${generateSource(sourceFile, {})}${options.footer ? `\n\n${options.footer}` : ''}`;
    ensureFile(options.out);
    writeFileSync(options.out, code);
}