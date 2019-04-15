import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { SourceFile, SyntaxKind, ClassDeclaration, InterfaceDeclaration, TypeAliasDeclaration, FunctionDeclaration, VariableDeclaration, ModuleDeclaration, TypeNode, isClassDeclaration, isInterfaceDeclaration, isTypeAliasDeclaration, isFunctionDeclaration, isVariableStatement, isVariableDeclaration, isModuleDeclaration, isImportDeclaration, isExportDeclaration, isNamespaceExportDeclaration, isExportAssignment, isImportEqualsDeclaration, isTypeReferenceNode, isUnionTypeNode, isArrayTypeNode, isParenthesizedTypeNode, Node, isTypeLiteralNode, TypeElement, isIndexSignatureDeclaration, TypeParameterDeclaration, createNodeArray, isPropertySignature, isIntersectionTypeNode, isFunctionTypeNode, ParameterDeclaration, isMethodSignature, isConstructSignatureDeclaration, isTypeParameterDeclaration, isTypeQueryNode, isExpressionWithTypeArguments, isPropertyDeclaration, isMethodDeclaration, PropertyDeclaration, MethodDeclaration, isIndexedAccessTypeNode, isLiteralTypeNode, isConstructorTypeNode, Statement, NodeArray, isSourceFile, isIdentifier, Identifier } from 'typescript';
import { ensureFile, getParamDescription, getReturnDescription, getNodeDescription, getNodeExamples, isExported } from '../helpers';
import { TemplateOptions } from './index';

type MarkdownTemplateOptions = TemplateOptions & {
    mode: 'module'|'files';
}

type FunctionDeclarations = { [key: string]: FunctionDeclaration[] };

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
            let name = node.name.getText();
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

function renderType(type: TypeNode|TypeElement|TypeParameterDeclaration, references: (TypeAliasDeclaration|InterfaceDeclaration)[], options: MarkdownTemplateOptions, useHtml: boolean = false): string {
    if (isTypeReferenceNode(type)) {
        let name = type.typeName.getText();
        let linked = references.find((item) => item.name.getText() === name);
        return `${linked ? toLink(name, linked, options, useHtml) : name}${type.typeArguments ? `<${type.typeArguments.map((arg) => renderType(arg, references, options, useHtml)).join(', ')}>` : ''}`;
    }
    if (isUnionTypeNode(type)) {
        return type.types.map((type) => renderType(type, references, options, useHtml)).join('|');
    }
    if (isIntersectionTypeNode(type)) {
        return type.types.map((type) => renderType(type, references, options, useHtml)).join(' & ');
    }
    if (isArrayTypeNode(type)) {
        return `${renderType(type.elementType, references, options, useHtml)}[]`;
    }
    if (isParenthesizedTypeNode(type)) {
        return `(${renderType(type.type, references, options, useHtml)})`;
    }
    if (isTypeLiteralNode(type)) {
        return `{
${type.members.map((member) => `${renderType(member, references, options, useHtml).replace(/^(.)/gm, '    $1')};`).join('\n')}
}`;
    }
    if (isIndexSignatureDeclaration(type)) {
        let param = type.parameters[0];
        return `[${param.name.getText()}: ${renderType(param.type, references, options, useHtml)}]: ${renderType(type.type, references, options, useHtml)}`;
    }
    if (isPropertySignature(type)) {
        return `${type.name.getText()}${type.questionToken ? '?' : ''}: ${renderType(type.type, references, options, useHtml)}`;
    }
    if (isFunctionTypeNode(type)) {
        return `(${
            type.parameters.map((param) => `${param.name.getText()}${param.questionToken ? '?' : ''}: ${renderType(param.type, references, options, useHtml)}`).join(', ')
        }): ${renderType(type.type, references, options, useHtml)}`;
    }
    if (isMethodSignature(type)) {
        return `${type.name.getText()}(${
            type.parameters.map((param) => `${param.name.getText()}${param.questionToken ? '?' : ''}: ${renderType(param.type, references, options, useHtml)}`).join(', ')
        }): ${renderType(type.type, references, options, useHtml)}`;
    }
    if (isConstructSignatureDeclaration(type)) {
        return `constructor(${
            type.parameters.map((param) => `${param.name.getText()}${param.questionToken ? '?' : ''}: ${renderType(param.type, references, options, useHtml)}`).join(', ')
        }): ${renderType(type.type, references, options, useHtml)}`;
    }
    if (isTypeQueryNode(type)) {
        let name = type.exprName.getText();
        let linked = references.find((item) => item.name.getText() === name);
        return `${linked ? toLink(name, linked, options, useHtml) : name}`;
    }
    if (isTypeParameterDeclaration(type)) {
        return `${type.name.getText()}${type.constraint ? ` extends ${renderType(type.constraint, references, options, useHtml)}` : ''}`;
    }
    if (isExpressionWithTypeArguments(type)) {
        let name = type.expression.getText();
        let linked = references.find((item) => item.name.getText() === name);
        return `${linked ? toLink(name, linked, options, useHtml) : name}`;
    }
    if (isIndexedAccessTypeNode(type)) {
        return `${renderType(type.objectType, references, options, useHtml)}[${renderType(type.indexType, references, options, useHtml)}]`;
    }
    if (isLiteralTypeNode(type)) {
        return type.literal.getText();
    }
    if (isConstructorTypeNode(type)) {
        return `constructor(${
            type.parameters.map((param) => `${param.name.getText()}${param.questionToken ? '?' : ''}: ${renderType(param.type, references, options, useHtml)}`).join(', ')
        }): ${renderType(type.type, references, options, useHtml)}`;
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
    }
    if (type.kind === SyntaxKind.LastTypeNode) {
        let name = type['qualifier'].getText();
        let linked = references.find((item) => item.name.getText() === name);
        return `${linked ? toLink(name, linked, options, useHtml) : name}`;
    }
    if (type.kind === SyntaxKind.FirstTypeNode) {
        let name = type['type'].getText();
        let linked = references.find((item) => item.name.getText() === name);
        return `${type['parameterName'].getText()} is ${linked ? toLink(name, linked, options, useHtml) : name}`;
    }
    console.log('unhandled type kind:', type.kind, SyntaxKind[type.kind]);
}

function toFile(node: Node): string {
    if (isFunctionDeclaration(node)) {
        return `method.${node.name.getText()}.md`;
    } else if (isVariableDeclaration(node)) {
        return `constant.${node.name.getText()}.md`;
    } else if (isInterfaceDeclaration(node) || isTypeAliasDeclaration(node)) {
        return `type.${node.name.getText()}.md`;
    } else if (isClassDeclaration(node)) {
        return `class.${node.name.getText()}.md`;
    } else if (isModuleDeclaration(node)) {
        return `namespace.${node.name.getText()}.md`;
    }
}

function toLink(label: string, node: Node, options: MarkdownTemplateOptions, useHtml: boolean = false): string {
    if (options.mode === 'files') {
        if (useHtml) {
            return `<a href="${toFile(node)}">${label}</a>`;
        }
        return `[${label}](${toFile(node)})`;
    }
    if (useHtml) {
        return `<a href="#${(node as any).name.getText()}">${label}</a>`;
    }
    return `[${label}](#${(node as any).name.getText()})`
}

function generateSummary(namespaces: ModuleDeclaration[], classes: ClassDeclaration[], methods: { [key: string]: FunctionDeclaration[] }, constants: VariableDeclaration[], types: Array<TypeAliasDeclaration | InterfaceDeclaration>, references, options: MarkdownTemplateOptions) {
    classes = classes.filter((clazz) => isExported(clazz));
    constants = constants.filter((constant) => isExported(constant.parent.parent));
    types = types.filter((type) => isExported(type));
    let methodsList = Object.values(methods).filter((methodList) => isExported(methodList[0]));

    return `
${namespaces.length ? `
**Namespaces**

${namespaces.map((ns) => toLink(ns.name.getText(), ns, options)).join(', ')}` : ''}

${classes.length ? `
**Classes**

${classes.map((clazz) => toLink(clazz.name.getText(), clazz, options)).join(', ')}` : ''}

${methodsList.length ? `
**Methods**

${methodsList.map((methodDeclarationList) => toLink(methodDeclarationList[0].name.getText(), methodDeclarationList[0], options)).join(', ')}` : ''}

${constants.length ? `
**Constants**

${constants.map((constant) => toLink(constant.name.getText(), constant, options)).join(', ')}` : ''}

${types.length ? `
**Types**

${types.map((type) => toLink(type.name.getText(), type, options)).join(', ')} ` : ''}

`;
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
            content += `\n\n---\n\n${nsContent}`;
        }
    });

    members.classes.forEach((clazz) => {
        let clazzContent = generateClass(clazz, references, options);
        if (options.mode === 'files') {
            let outFile = join(dirname(options.out), toFile(clazz));
            ensureFile(outFile);
            writeFileSync(outFile, clazzContent);
        } else {
            content += `\n\n---\n\n${clazzContent}`;
        }
    });

    Object.values(members.methods).forEach((methodDeclarationList) => {
        let methodContent = generateMethod(methodDeclarationList, references, options);
        if (options.mode === 'files') {
            let outFile = join(dirname(options.out), toFile(methodDeclarationList[0]));
            ensureFile(outFile);
            writeFileSync(outFile, methodContent);
        } else {
            content += `\n\n---\n\n${methodContent}`;
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
            console.log('>>>', name.getText())
            return !globalRefs.some((ref) => ref.name.getText() === name.getText())
        })
        .forEach((constant) => {
            let variableContent = generateConstant(constant, references, options);
            if (options.mode === 'files') {
                let outFile = join(dirname(options.out), toFile(constant));
                ensureFile(outFile);
                writeFileSync(outFile, variableContent);
            } else {
                content += `\n\n---\n\n${variableContent}`;
            }
        });

    members.types.forEach((type) => {
        let typeContent = generateType(type, references, options);
        if (options.mode === 'files') {
            let outFile = join(dirname(options.out), toFile(type));
            ensureFile(outFile);
            writeFileSync(outFile, typeContent);
        } else {
            content += `\n\n---\n\n${typeContent}`;
        }
    });

    return content;
}

function generateNamespace(ns: ModuleDeclaration, references, options) {
    let description = getNodeDescription(ns);
    return `### ${ns.name.getText()}

${description || ''}

${generateModule((ns.body as any).statements, references || [], options)}`;
}

function generateSource(source: SourceFile, options) {
    return generateModule(source.statements, [], options);
}

function generateClass(clazz: ClassDeclaration, references, options) {
    let description = getNodeDescription(clazz);
    let samples = getNodeExamples(clazz);
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
            let name = member.name.getText();
            if (member.modifiers && member.modifiers.some((mod) => mod.kind === SyntaxKind.StaticKeyword)) {
                staticMethods[name] = staticMethods[name] || [];
                staticMethods[name].push(member);
            } else {
                instanceMethods[name] = instanceMethods[name] || [];
                instanceMethods[name].push(member);
            }
        });
    return `### ${clazz.name.getText()}

${clazz.heritageClauses && clazz.heritageClauses.length ? `**Extends:** ${renderType(clazz.heritageClauses[0].types[0], references, options)}` : ''}

${description ? description.trim() : ''}

${samples.length ? `**Examples**

${samples.join('\n\n')}` : ''}

${instanceProperties.length ? `**Properties**

| Name | Type | Readonly | Description |
| :--- | :--- | :------: | :---------- |
${instanceProperties.map((prop) => `| ${prop.name.getText()} | <code>${renderType(prop.type, references, options).replace(/</g, '&lt;').replace(/\|/g, '\\|') || ''}</code> | ${prop.modifiers && prop.modifiers.some((mod) => mod.kind === SyntaxKind.ReadonlyKeyword) ? '✓' : ''} | ${getNodeDescription(prop) || ''} |`).join('\n')}
` : ''}

${Object.keys(instanceMethods).length ? `**Methods**

${Object.values(instanceMethods).map((methodList) => generateMethod(methodList, references, options)).join('\n\n')}
`: ''}

${staticProperties.length ? `**Static properties**

| Name | Type | Readonly | Description |
| :--- | :--- | :------: | :---------- |
${staticProperties.map((prop) => `| ${prop.name.getText()} | <code>${renderType(prop.type, references, options).replace(/</g, '&lt;').replace(/\|/g, '\\|') || ''}</code> | ${prop.modifiers && prop.modifiers.some((mod) => mod.kind === SyntaxKind.ReadonlyKeyword) ? '✓' : ''} | ${getNodeDescription(prop) || ''} |`).join('\n')}
` : ''}

${Object.keys(staticMethods).length ? `**Static methods**

${Object.values(staticMethods).map((methodList) => generateMethod(methodList, references, options)).join('\n\n')}
`: ''}
`;
}

function generateMethod(methodDeclarationList: (FunctionDeclaration|MethodDeclaration)[], references, options: MarkdownTemplateOptions) {
    let name = methodDeclarationList[0].name.getText();
    let description = getNodeDescription(methodDeclarationList[0]);
    let samples = getNodeExamples(methodDeclarationList[0]);
    return `### ${name}

${description ? description.trim() : ''}

${methodDeclarationList.map((method) => `<details>
<summary>
<code>(${method.parameters.map((param) => `${param.name.getText()}${param.questionToken ? '?' : ''}: ${renderType(param.type, references, options, true)}`).join(', ').replace(/</g, '&lt;')}): ${renderType(method.type, references, options, true).replace(/</g, '&lt;')}</code>
</summary>

${method.parameters.length ? `**Params**

| Name | Type | Optional | Description |
| ---- | ---- | :------: | ----------- |
${method.parameters
        .map((param) => `| ${param.name.getText()} | <code>${renderType(param.type, references, options).replace(/</g, '&lt;').replace(/\|/g, '\\|').replace(/\n/g, ' ')}</code> | ${param.questionToken ? '✓' : ''} | ${getParamDescription(methodDeclarationList[0], param.name.getText()) || ''} |`)
        .join('\n')}` : ''}

**Returns**: <code>${renderType(method.type, references, options).replace(/\n/g, ' ')}</code> ${getReturnDescription(methodDeclarationList[0]) || ''}

</details>`).join('\n')}

${samples.length ? `**Examples**

${samples.join('\n\n')}` : ''}
`;
}

function generateConstant(constant: VariableDeclaration, references, options) {
    let description = getNodeDescription(constant) || getNodeDescription(constant.parent.parent);
    let samples = getNodeExamples(constant);
    return `### ${constant.name.getText()}

${description ? description.trim() : ''}

${samples.length ? `**Examples**

${samples.join('\n\n')}` : ''}

${constant.type ? `**Type:**\n\n<pre>${renderType(constant.type, references, options).replace(/</g, '&lt;').replace(/ /g, '&nbsp;')}</pre>` : ''}
`;
}

function generateType(type: TypeAliasDeclaration|InterfaceDeclaration, references, options) {
    let description = getNodeDescription(type);
    let samples = getNodeExamples(type);
    let declarations;
    if (isTypeAliasDeclaration(type)) {
        declarations = renderType(type.type, references, options);
    } else {
        declarations = (type.typeParameters || createNodeArray()).map((type) => renderType(type, references, options)).join('|');
    }
    return `### ${type.name.getText()}

${description ? description.trim() : ''}

${samples.length ? `**Examples**

${samples.join('\n\n')}` : ''}

<pre>${declarations.replace(/</g, '&lt;').replace(/ /g, '&nbsp;')}</pre>
`;
}

export = function markdown(sourceFiles: SourceFile[], options: MarkdownTemplateOptions) {
    let indexContent = '';

    sourceFiles.forEach((source) => {
        indexContent += `${generateSource(source, {})}`
    });

    ensureFile(options.out);
    writeFileSync(options.out, indexContent);
}