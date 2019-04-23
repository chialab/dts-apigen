import { Node, SyntaxKind, VariableStatement, createModuleDeclaration, createModuleBlock, Identifier, ObjectLiteralExpression, PropertyAssignment, NodeFlags, createVariableStatement, createModifier, createVariableDeclarationList, createVariableDeclaration } from 'typescript';
import { getOriginalNode, getJSDocTagByName } from '../helpers/ast';
import { createTransformer } from '../helpers/transformer';

export function visitor(node: Node): Node {
    switch (node.kind) {
        case SyntaxKind.VariableStatement: {
            let originalNode = getOriginalNode(node) as VariableStatement;
            if (getJSDocTagByName(originalNode, 'namespace')) {
                let variableNode = originalNode.declarationList.declarations[0];
                let initializer = variableNode.initializer as ObjectLiteralExpression;
                return createModuleDeclaration([], [...(originalNode.modifiers || []), createModifier(SyntaxKind.DeclareKeyword)], variableNode.name as Identifier, createModuleBlock(
                    initializer.properties.map((prop: PropertyAssignment) =>
                        createVariableStatement([createModifier(SyntaxKind.ExportKeyword)], createVariableDeclarationList([
                            createVariableDeclaration(prop.name as Identifier, undefined, prop.initializer || (prop.name as Identifier)),
                        ], NodeFlags.Const))
                    )
                ), NodeFlags.Namespace);
            }
            break;
        }
    }
    return node;
}

export const transformer = createTransformer(visitor);
