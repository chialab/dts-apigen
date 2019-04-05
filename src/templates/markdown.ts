import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { SourceFile, SyntaxKind, ClassDeclaration, InterfaceDeclaration, TypeAliasDeclaration, FunctionDeclaration, VariableDeclaration, ModuleDeclaration, TypeNode, ArrayTypeNode, TypeReferenceNode, UnionTypeNode, ParenthesizedTypeNode, NodeArray, isClassDeclaration, isInterfaceDeclaration, isTypeAliasDeclaration, isFunctionDeclaration, isVariableStatement, isVariableDeclaration, isModuleDeclaration, isImportDeclaration, isExportDeclaration, isNamespaceExportDeclaration, isExportAssignment, isImportEqualsDeclaration, isTypeReferenceNode, isUnionTypeNode, isArrayTypeNode, isParenthesizedTypeNode, Node, isTypeLiteralNode, TypeElement, isIndexSignatureDeclaration, TypeParameterDeclaration, createNodeArray, isPropertySignature, isIntersectionTypeNode, isFunctionTypeNode, ParameterDeclaration, isMethodSignature, isConstructSignatureDeclaration, isTypeParameterDeclaration, isTypeQueryNode, isExpressionWithTypeArguments, isPropertyDeclaration, isMethodDeclaration, PropertyDeclaration, MethodDeclaration, isIndexedAccessTypeNode, isLiteralTypeNode } from 'typescript';
import { ensureFile, getParamDescription, getReturnDescription, getNodeDescription } from '../helpers';
import { TemplateOptions } from './index';
import { IPackageJson } from '@microsoft/node-core-library';

type MarkdownTemplateOptions = TemplateOptions & {
    mode: 'module'|'files';
}

function renderType(type: TypeNode|TypeElement|TypeParameterDeclaration, list: (TypeAliasDeclaration|InterfaceDeclaration)[], options: MarkdownTemplateOptions, useHtml: boolean = false): string {
    if (isTypeReferenceNode(type)) {
        let name = type.typeName.getText();
        let linked = list.find((item) => item.name.getText() === name);
        return `${linked ? toLink(name, linked, options, useHtml) : name}${type.typeArguments ? `<${type.typeArguments.map((arg) => renderType(arg, list, options, useHtml)).join(', ')}>` : ''}`;
    }
    if (isUnionTypeNode(type)) {
        return type.types.map((type) => renderType(type, list, options, useHtml)).join('|');
    }
    if (isIntersectionTypeNode(type)) {
        return type.types.map((type) => renderType(type, list, options, useHtml)).join(' & ');
    }
    if (isArrayTypeNode(type)) {
        return `${renderType(type.elementType, list, options, useHtml)}[]`;
    }
    if (isParenthesizedTypeNode(type)) {
        return `(${renderType(type.type, list, options, useHtml)})`;
    }
    if (isTypeLiteralNode(type)) {
        return `{
${type.members.map((member) => `${renderType(member, list, options, useHtml).replace(/^(.)/gm, '    $1')};`).join('\n')}
}`;
    }
    if (isIndexSignatureDeclaration(type)) {
        let param = type.parameters[0];
        return `[${param.name.getText()}: ${renderType(param.type, list, options, useHtml)}]: ${renderType(type.type, list, options, useHtml)}`;
    }
    if (isPropertySignature(type)) {
        return `${type.name.getText()}${type.questionToken ? '?' : ''}: ${renderType(type.type, list, options, useHtml)}`;
    }
    if (isFunctionTypeNode(type)) {
        return `(${
            type.parameters.map((param) => `${param.name.getText()}${param.questionToken ? '?' : ''}: ${renderType(param.type, list, options, useHtml)}`).join(', ')
        }): ${renderType(type.type, list, options, useHtml)}`;
    }
    if (isMethodSignature(type)) {
        return `${type.name.getText()}(${
            type.parameters.map((param) => `${param.name.getText()}${param.questionToken ? '?' : ''}: ${renderType(param.type, list, options, useHtml)}`).join(', ')
        }): ${renderType(type.type, list, options, useHtml)}`;
    }
    if (isConstructSignatureDeclaration(type)) {
        return `constructor(${
            type.parameters.map((param) => `${param.name.getText()}${param.questionToken ? '?' : ''}: ${renderType(param.type, list, options, useHtml)}`).join(', ')
        }): ${renderType(type.type, list, options, useHtml)}`;
    }
    if (isTypeQueryNode(type)) {
        return type.exprName.getText();
    }
    if (isTypeParameterDeclaration(type)) {
        return `${type.name.getText()}${type.constraint ? ` extends ${renderType(type.constraint, list, options, useHtml)}` : ''}`;
    }
    if (isExpressionWithTypeArguments(type)) {
        let name = type.expression.getText();
        let linked = list.find((item) => item.name.getText() === name);
        return `${linked ? toLink(name, linked, options, useHtml) : name}`;
    }
    if (isIndexedAccessTypeNode(type)) {
        return `${renderType(type.objectType, list, options, useHtml)}[${renderType(type.indexType, list, options, useHtml)}]`;
    }
    if (isLiteralTypeNode(type)) {
        return type.literal.getText();
    }
    switch (type.kind) {
        case SyntaxKind.NumberKeyword:
            return 'number';
        case SyntaxKind.StringKeyword:
            return 'string';
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
        let linked = list.find((item) => item.name.getText() === name);
        return `${linked ? toLink(name, linked, options, useHtml) : name}`;
    }
    if (type.kind === SyntaxKind.FirstTypeNode) {
        let name = type['type'].getText();
        let linked = list.find((item) => item.name.getText() === name);
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

function generateIndex(modules: ModuleDeclaration[], classes: ClassDeclaration[], methods: { [key: string]: FunctionDeclaration[] }, constants: VariableDeclaration[], types: Array<TypeAliasDeclaration|InterfaceDeclaration>, packageJson: IPackageJson, options: MarkdownTemplateOptions) {
    return `# ${packageJson.name}

## Summary

${modules.length ? `
| Modules |
| ------- |
| ${modules.map((mod) => `${mod.name.getText()}`).join(', ')} |` : ''}
${classes.length ? `
| Classes |
| ------- |
| ${classes.map((clazz) => toLink(clazz.name.getText(), clazz, options)).join(', ')} |` : ''}
${Object.values(methods).length ? `
| Methods |
| ------- |
| ${Object.values(methods).map((methodDeclarationList) => toLink(methodDeclarationList[0].name.getText(), methodDeclarationList[0], options)).join(', ')} |` : ''}
${constants.length ? `
| Constants |
| ------- |
| ${constants.map((constant) => toLink(constant.name.getText(), constant, options)).join(', ')} |` : ''}
${types.length ? `
| Types |
| ------- |
| ${types.map((type) => toLink(type.name.getText(), type, options)).join(', ')} |` : ''}`;
}

function generateClass(clazz: ClassDeclaration, types, options) {
    let description = getNodeDescription(clazz);
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
    let instanceMethods: { [key: string]: MethodDeclaration[] } = {};
    let staticMethods: { [key: string]: MethodDeclaration[] } = {};
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

${clazz.heritageClauses.length ? `**Extends:** ${renderType(clazz.heritageClauses[0].types[0], types, options)}` : ''}

${description ? `\n${description.trim()}\n` : ''}
${instanceProperties.length ? `#### Properties

| Name | Type | Readonly | Description |
| ---- | ---- | :------: | ----------- |
${instanceProperties.map((prop) => `| ${prop.name.getText()} | <code>${renderType(prop.type, types, options).replace(/\|/g, '\\|') || ''}</code> | ${prop.modifiers.some((mod) => mod.kind === SyntaxKind.ReadonlyKeyword) ? '✓' : ''} | ${getNodeDescription(prop) || ''} |`).join('\n')}
` : ''}

${Object.keys(instanceMethods).length ? `#### Methods

${Object.values(instanceMethods).map((methodList) => generateMethod(methodList, types, options, false)).join('\n\n')}
`: ''}

${staticProperties.length ? `#### Static properties

| Name | Type | Readonly | Description |
| ---- | ---- | :------: | ----------- |
${staticProperties.map((prop) => `| ${prop.name.getText()} | <code>${renderType(prop.type, types, options).replace(/\|/g, '\\|') || ''}</code> | ${prop.modifiers.some((mod) => mod.kind === SyntaxKind.ReadonlyKeyword) ? '✓' : ''} | ${getNodeDescription(prop) || ''} |`).join('\n')}
` : ''}

${Object.keys(staticMethods).length ? `#### Static methods

${Object.values(staticMethods).map((methodList) => generateMethod(methodList, types, options, false)).join('\n\n')}
`: ''}
`;
}

function generateMethod(methodDeclarationList: (FunctionDeclaration|MethodDeclaration)[], types, options: MarkdownTemplateOptions, isTitle: boolean = true) {
    let description = getNodeDescription(methodDeclarationList[0]);
    return `${isTitle ? '### ' : '**'}${methodDeclarationList[0].name.getText()}${isTitle ? '' : '**'}

${description ? `\n${description.trim()}\n` : ''}
${methodDeclarationList.map((method) => `<details>
<summary>
<code>(${method.parameters.map((param) => `${param.name.getText()}${param.questionToken ? '?' : ''}: ${renderType(param.type, types, options, true)}`).join(', ')}): ${renderType(method.type, types, options, true)}</code>
</summary>

${method.parameters.length ? `**Params**

| Name | Type | Optional | Description |
| ---- | ---- | :------: | ----------- |
${method.parameters
        .map((param) => `| ${param.name.getText()} | <code>${renderType(param.type, types, options).replace(/\|/g, '\\|').replace(/\n/g, ' ')}</code> | ${param.questionToken ? '✓' : ''} | ${getParamDescription(methodDeclarationList[0], param.name.getText()) || ''} |`)
        .join('\n')}` : ''}

**Returns**: <code>${renderType(method.type, types, options).replace(/\n/g, ' ')}</code> ${getReturnDescription(methodDeclarationList[0]) || ''}

</details>`).join('\n')}`;
}

function generateConstant(constant: VariableDeclaration, types, options) {
    let description = getNodeDescription(constant) || getNodeDescription(constant.parent.parent);
    return `### ${constant.name.getText()}

${description ? `\n${description.trim()}\n` : ''}
${constant.type ? `**Type:**\n\n<code>${renderType(constant.type, types, options).replace(/\n/g, '<br>').replace(/\s/g, '&nbsp;')}</code>` : ''}
`;
}

function generateType(type: TypeAliasDeclaration|InterfaceDeclaration, types, options) {
    let description = getNodeDescription(type);
    let declarations;
    if (isTypeAliasDeclaration(type)) {
        declarations = renderType(type.type, types, options);
    } else {
        declarations = (type.typeParameters || createNodeArray()).map((type) => renderType(type, types, options)).join('|');
    }
    return `### ${type.name.getText()}

${description ? `\n${description.trim()}\n` : ''}

<code>${declarations.replace(/\n/g, '<br>').replace(/\s/g, '&nbsp;')}</code>
`;
}

export = function markdown(sourceFiles: SourceFile[], packageJson: IPackageJson, options: MarkdownTemplateOptions) {
    const classes: ClassDeclaration[] = [];
    const types: Array<TypeAliasDeclaration|InterfaceDeclaration> = [];
    const methods: { [key: string]: FunctionDeclaration[] } = {};
    const constants: VariableDeclaration[] = [];
    const modules: ModuleDeclaration[] = [];
    const references: Node[] = [];

    sourceFiles.forEach((source) => {
        source.statements.forEach((node) => {
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
                modules.push(node);
                references.push(node);
            } else if (isImportDeclaration(node) || isExportDeclaration(node) || isNamespaceExportDeclaration(node) || isExportAssignment(node) || isImportEqualsDeclaration(node)) {
                // ignore
            } else {
                console.log('unhandled node type:', node.kind, SyntaxKind[node.kind], `in ${source.fileName}`);
            }
        });
    });

    let indexContent = generateIndex(
        modules,
        classes,
        methods,
        constants,
        types,
        packageJson,
        options,
    );

    classes.forEach((clazz) => {
        let clazzContent = generateClass(clazz, references, options);
        if (options.mode === 'files') {
            let outFile = join(dirname(options.out), toFile(clazz));
            ensureFile(outFile);
            writeFileSync(outFile, clazzContent);
        } else {
            indexContent += `\n\n---\n\n${clazzContent}`;
        }
    });

    Object.values(methods).forEach((methodDeclarationList) => {
        let methodContent = generateMethod(methodDeclarationList, references, options);
        if (options.mode === 'files') {
            let outFile = join(dirname(options.out), toFile(methodDeclarationList[0]));
            ensureFile(outFile);
            writeFileSync(outFile, methodContent);
        } else {
            indexContent += `\n\n---\n\n${methodContent}`;
        }
    });

    constants.forEach((constant) => {
        let variableContent = generateConstant(constant, references, options);
        if (options.mode === 'files') {
            let outFile = join(dirname(options.out), toFile(constant));
            ensureFile(outFile);
            writeFileSync(outFile, variableContent);
        } else {
            indexContent += `\n\n---\n\n${variableContent}`;
        }
    });

    types.forEach((type) => {
        let typeContent = generateType(type, references, options);
        if (options.mode === 'files') {
            let outFile = join(dirname(options.out), toFile(type));
            ensureFile(outFile);
            writeFileSync(outFile, typeContent);
        } else {
            indexContent += `\n\n---\n\n${typeContent}`;
        }
    });

    ensureFile(options.out);
    writeFileSync(options.out, indexContent);
}