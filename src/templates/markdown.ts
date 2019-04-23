import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { SourceFile, SyntaxKind, ClassDeclaration, InterfaceDeclaration, TypeAliasDeclaration, FunctionDeclaration, VariableDeclaration, ModuleDeclaration, TypeNode, isClassDeclaration, isInterfaceDeclaration, isTypeAliasDeclaration, isFunctionDeclaration, isVariableStatement, isVariableDeclaration, isModuleDeclaration, isImportDeclaration, isExportDeclaration, isNamespaceExportDeclaration, isExportAssignment, isImportEqualsDeclaration, isTypeReferenceNode, isUnionTypeNode, isArrayTypeNode, isParenthesizedTypeNode, Node, isTypeLiteralNode, TypeElement, isIndexSignatureDeclaration, TypeParameterDeclaration, createNodeArray, isPropertySignature, isIntersectionTypeNode, isFunctionTypeNode, ParameterDeclaration, isMethodSignature, isConstructSignatureDeclaration, isTypeParameterDeclaration, isTypeQueryNode, isExpressionWithTypeArguments, isPropertyDeclaration, isMethodDeclaration, PropertyDeclaration, MethodDeclaration, isIndexedAccessTypeNode, isLiteralTypeNode, isConstructorTypeNode, Statement, NodeArray, isSourceFile, isIdentifier, Identifier, isTupleTypeNode } from 'typescript';
import { ensureFile } from '../helpers/fs';
import { getJSDocParamDescription, getJSDocReturnDescription, getJSDocDescription, getJSDocExamples, isExported } from '../helpers/ast';
import { TemplateOptions } from './index';

type MarkdownTemplateOptions = TemplateOptions & {
    mode: 'module'|'files';
}

type FunctionDeclarations = { [key: string]: FunctionDeclaration[] };

function nameToString(node): string {
    return node.escapedText || node.getText();
}

function cleanupCode(code: string): string {
    return code.replace(/</g, '&lt;');
}

function toLink(label: string, node: Node, options: MarkdownTemplateOptions): string {
    if (options.mode === 'files') {
        return `[${label}](${toFile(node)})`;
    }
    return `[${label}](#${nameToString((node as any).name)})`
}

function normalizeLinks(code) {
    return code.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
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
            let name = nameToString(node.name);
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
        let name = nameToString(type.typeName);
        let linked = references.find((item) => nameToString(item.name) === name);
        return `${linked ? toLink(name, linked, options) : name}${type.typeArguments ? `<${type.typeArguments.map((arg) => renderType(arg, references, options)).join(', ')}>` : ''}`;
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
        return `[${nameToString(param.name)}: ${renderType(param.type, references, options)}]: ${renderType(type.type, references, options)}`;
    }
    if (isPropertySignature(type)) {
        return `${nameToString(type.name)}${type.questionToken ? '?' : ''}: ${renderType(type.type, references, options)}`;
    }
    if (isFunctionTypeNode(type)) {
        return `(${
            type.parameters.map((param) => `${nameToString(param.name)}${param.questionToken ? '?' : ''}: ${renderType(param.type, references, options)}`).join(', ')
        }): ${renderType(type.type, references, options)}`;
    }
    if (isMethodSignature(type)) {
        return `${nameToString(type.name)}(${
            type.parameters.map((param) => `${nameToString(param.name)}${param.questionToken ? '?' : ''}: ${renderType(param.type, references, options)}`).join(', ')
        }): ${renderType(type.type, references, options)}`;
    }
    if (isConstructSignatureDeclaration(type)) {
        return `constructor(${
            type.parameters.map((param) => `${nameToString(param.name)}${param.questionToken ? '?' : ''}: ${renderType(param.type, references, options)}`).join(', ')
        }): ${renderType(type.type, references, options)}`;
    }
    if (isTypeQueryNode(type)) {
        let name = nameToString(type.exprName);
        let linked = references.find((item) => nameToString(item.name) === name);
        return `${linked ? toLink(name, linked, options) : name}`;
    }
    if (isTypeParameterDeclaration(type)) {
        return `${nameToString(type.name)}${type.constraint ? ` extends ${renderType(type.constraint, references, options)}` : ''}`;
    }
    if (isExpressionWithTypeArguments(type)) {
        let name = nameToString(type.expression);
        let linked = references.find((item) => nameToString(item.name) === name);
        return `${linked ? toLink(name, linked, options) : name}`;
    }
    if (isIndexedAccessTypeNode(type)) {
        return `${renderType(type.objectType, references, options)}[${renderType(type.indexType, references, options)}]`;
    }
    if (isTupleTypeNode(type)) {
        return `[${type.elementTypes.map((t) => renderType(t, references, options)).join(', ')}]`;
    }
    if (isLiteralTypeNode(type)) {
        return nameToString(type.literal);
    }
    if (isConstructorTypeNode(type)) {
        return `constructor(${
            type.parameters.map((param) => `${nameToString(param.name)}${param.questionToken ? '?' : ''}: ${renderType(param.type, references, options)}`).join(', ')
        }): ${renderType(type.type, references, options)}`;
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
    if (type.kind === SyntaxKind.LastTypeNode) {
        let name = nameToString(type['qualifier']);
        let linked = references.find((item) => nameToString(item.name) === name);
        return `${linked ? toLink(name, linked, options) : name}`;
    }
    if (type.kind === SyntaxKind.FirstTypeNode) {
        let name = nameToString(type['type']);
        let linked = references.find((item) => nameToString(item.name) === name);
        return `${nameToString(type['parameterName'])} is ${linked ? toLink(name, linked, options) : name}`;
    }
    console.log('unhandled type kind:', type.kind, SyntaxKind[type.kind]);
    return '';
}

function toFile(node: Node): string {
    if (isFunctionDeclaration(node)) {
        return `method.${nameToString(node.name)}.md`;
    } else if (isVariableDeclaration(node)) {
        return `constant.${nameToString(node.name)}.md`;
    } else if (isInterfaceDeclaration(node) || isTypeAliasDeclaration(node)) {
        return `type.${nameToString(node.name)}.md`;
    } else if (isClassDeclaration(node)) {
        return `class.${nameToString(node.name)}.md`;
    } else if (isModuleDeclaration(node)) {
        return `namespace.${nameToString(node.name)}.md`;
    }
}

function generateSummary(namespaces: ModuleDeclaration[], classes: ClassDeclaration[], methods: { [key: string]: FunctionDeclaration[] }, constants: VariableDeclaration[], types: Array<TypeAliasDeclaration | InterfaceDeclaration>, references, options: MarkdownTemplateOptions) {
    classes = classes.filter((clazz) => isExported(clazz));
    constants = constants.filter((constant) => isExported(constant.parent.parent));
    types = types.filter((type) => isExported(type));
    let methodsList = Object.values(methods).filter((methodList) => isExported(methodList[0]));

    return normalizeLinks(`
${namespaces.length ? `
<strong>Namespaces</strong>

${namespaces.map((ns) => toLink(nameToString(ns.name), ns, options)).join(', ')}` : ''}

${classes.length ? `
<strong>Classes</strong>

${classes.map((clazz) => toLink(nameToString(clazz.name), clazz, options)).join(', ')}` : ''}

${methodsList.length ? `
<strong>Methods</strong>

${methodsList.map((methodDeclarationList) => toLink(nameToString(methodDeclarationList[0].name), methodDeclarationList[0], options)).join(', ')}` : ''}

${constants.length ? `
<strong>Constants</strong>

${constants.map((constant) => toLink(nameToString(constant.name), constant, options)).join(', ')}` : ''}

${types.length ? `
<strong>Types</strong>

${types.map((type) => toLink(nameToString(type.name), type, options)).join(', ')} ` : ''}

`);
}

function generateModule(statements: NodeArray<Statement>, globalRefs, options) {
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
            let outFile = join(dirname(options.out), toFile(ns));
            ensureFile(outFile);
            writeFileSync(outFile, nsContent);
        } else {
            content += `\n\n<hr />\n\n${nsContent}`;
        }
    });

    members.classes.forEach((clazz) => {
        let clazzContent = generateClass(clazz, references, options);
        if (options.mode === 'files') {
            let outFile = join(dirname(options.out), toFile(clazz));
            ensureFile(outFile);
            writeFileSync(outFile, clazzContent);
        } else {
            content += `\n\n<hr />\n\n${clazzContent}`;
        }
    });

    Object.values(members.methods).forEach((methodDeclarationList) => {
        let methodContent = generateMethod(methodDeclarationList, references, options);
        if (options.mode === 'files') {
            let outFile = join(dirname(options.out), toFile(methodDeclarationList[0]));
            ensureFile(outFile);
            writeFileSync(outFile, methodContent);
        } else {
            content += `\n\n<hr />\n\n${methodContent}`;
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
            return !globalRefs.some((ref) => nameToString(ref.name) === nameToString(name))
        })
        .forEach((constant) => {
            let variableContent = generateConstant(constant, references, options);
            if (options.mode === 'files') {
                let outFile = join(dirname(options.out), toFile(constant));
                ensureFile(outFile);
                writeFileSync(outFile, variableContent);
            } else {
                content += `\n\n<hr />\n\n${variableContent}`;
            }
        });

    members.types.forEach((type) => {
        let typeContent = generateType(type, references, options);
        if (options.mode === 'files') {
            let outFile = join(dirname(options.out), toFile(type));
            ensureFile(outFile);
            writeFileSync(outFile, typeContent);
        } else {
            content += `\n\n<hr />\n\n${typeContent}`;
        }
    });

    return content;
}

function generateNamespace(ns: ModuleDeclaration, references, options) {
    let description = getJSDocDescription(ns);
    return normalizeLinks(`<h3>${nameToString(ns.name)}</h3>

<p>${description ? description.trim() : ''}</p>

${generateModule((ns.body as any).statements, references || [], options)}`);
}

function generateSource(source: SourceFile, options) {
    return generateModule(source.statements, [], options);
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
            let name = nameToString(member.name);
            if (member.modifiers && member.modifiers.some((mod) => mod.kind === SyntaxKind.StaticKeyword)) {
                staticMethods[name] = staticMethods[name] || [];
                staticMethods[name].push(member);
            } else {
                instanceMethods[name] = instanceMethods[name] || [];
                instanceMethods[name].push(member);
            }
        });
    return normalizeLinks(`<h3>${nameToString(clazz.name)}</h3>

${clazz.heritageClauses && clazz.heritageClauses.length ? `<strong>Extends:</strong> ${renderType(clazz.heritageClauses[0].types[0], references, options)}` : ''}

<p>${description ? description.trim() : ''}</p>

${samples.length ? `<strong>Examples</strong>

${samples.join('\n\n')}` : ''}

${instanceProperties.length ? `<strong>Properties</strong>

<table>
    <thead>
        <th>Name</th>
        <th>Type</th>
        <th>Readonly</th>
        <th>Description</th>
    </thead>
    <tbody>
        <tr>${instanceProperties.map((prop) => `
            <td>${nameToString(prop.name)}</td>
            <td><code>${cleanupCode(renderType(prop.type, references, options)).replace(/\|/g, '\\|') || ''}</code></td>
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
        <th>Name</th>
        <th>Type</th>
        <th>Readonly</th>
        <th>Description</th>
    </thead>
    <tbody>
        <tr>${staticProperties.map((prop) => `
            <td>${nameToString(prop.name)}</td>
            <td><code>${cleanupCode(renderType(prop.type, references, options)).replace(/\|/g, '\\|') || ''}</code></td>
            <td align="center">${prop.modifiers && prop.modifiers.some((mod) => mod.kind === SyntaxKind.ReadonlyKeyword) ? '✓' : ''}</td>
            <td>${getJSDocDescription(prop) || ''}</td>`).join('</tr>\n<tr>')}
        </tr>
    </tbody>
</table>
` : ''}

${Object.keys(staticMethods).length ? `<strong>Static methods</strong>

${Object.values(staticMethods).map((methodList) => generateMethod(methodList, references, options)).join('\n\n')}
`: ''}
`);
}

function generateMethod(methodDeclarationList: (FunctionDeclaration|MethodDeclaration)[], references, options: MarkdownTemplateOptions) {
    let name = nameToString(methodDeclarationList[0].name);
    let description = getJSDocDescription(methodDeclarationList[0]);
    let samples = getJSDocExamples(methodDeclarationList[0]);
    return normalizeLinks(`<h3>${name}</h3>

<p>${description ? description.trim() : ''}</p>

${methodDeclarationList.map((method) => `<details>
<summary>
<code>(${cleanupCode(method.parameters.map((param) => `${nameToString(param.name)}${param.questionToken ? '?' : ''}: ${renderType(param.type, references, options)})`).join(', '))}): ${cleanupCode(renderType(method.type, references, options))}</code>
</summary>

${method.parameters.length ? `<strong>Params</strong>

<table>
    <thead>
        <th>Name</th>
        <th>Type</th>
        <th>Optional</th>
        <th>Description</th>
    </thead>
    <tbody>
        <tr>${method.parameters.map((param) => `
            <td>${nameToString(param.name)}</td>
            <td><code>${cleanupCode(renderType(param.type, references, options)).replace(/\|/g, '\\|').replace(/\n/g, ' ')}</code></td>
            <td align="center">${param.questionToken ? '✓' : ''}</td>
            <td>${getJSDocParamDescription(methodDeclarationList[0], nameToString(param.name)) || ''}</td>`)
                .join('</tr>\n<tr>')}` : ''}
        </tr>
    </tbody>
</table>

<strong>Returns</strong>: <code>${renderType(method.type, references, options).replace(/\n/g, ' ')}</code> ${getJSDocReturnDescription(methodDeclarationList[0]) || ''}

</details>`).join('\n')}

${samples.length ? `<strong>Examples</strong>

${samples.join('\n\n')}` : ''}
`);
}

function generateConstant(constant: VariableDeclaration, references, options) {
    let description = getJSDocDescription(constant) || getJSDocDescription(constant.parent.parent);
    let samples = getJSDocExamples(constant);
    return normalizeLinks(`<h3>${nameToString(constant.name)}</h3>

<p>${description ? description.trim() : ''}</p>

${samples.length ? `<strong>Examples</strong>

${samples.join('\n\n')}` : ''}

${constant.type ? `<strong>Type:</strong>\n\n<pre>${cleanupCode(renderType(constant.type, references, options))}</pre>` : ''}
`);
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
    return normalizeLinks(`<h3>${nameToString(type.name)}</h3>

<p>${description ? description.trim() : ''}</p>

${samples.length ? `<strong>Examples</strong>

${samples.join('\n\n')}` : ''}

<pre>${cleanupCode(declarations).replace(/ /g, '&nbsp;')}</pre>
`);
}

export = function markdown(sourceFile: SourceFile, options: MarkdownTemplateOptions) {
    const code = generateSource(sourceFile, {});
    ensureFile(options.out);
    writeFileSync(options.out, code);
}