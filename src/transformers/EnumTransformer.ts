import { Node, SyntaxKind, VariableStatement, VariableDeclaration, createEnumDeclaration, isObjectLiteralExpression, createEnumMember, PropertyAssignment, createModifier } from 'typescript';
import { getJSDocTagByName, getOriginalNode } from '../helpers/ast';
import { createTransformer } from '../helpers/transformer';

export function visitor(node: Node): Node {
    switch (node.kind) {
        case SyntaxKind.VariableStatement: {
            let originalNode = getOriginalNode(node) as VariableStatement;
            let tag = getJSDocTagByName(originalNode, 'enum');
            let declarations = (originalNode as VariableStatement).declarationList.declarations;
            let declaration: VariableDeclaration = declarations[0];
            if (tag && declarations.length === 1 && isObjectLiteralExpression(declaration.initializer)) {
                let enumDecl = createEnumDeclaration(node.decorators, node.modifiers, declaration.name.getText(),
                    declaration.initializer.properties.map((property: PropertyAssignment) => createEnumMember(property.name, property.initializer))
                );
                (enumDecl as any).emitNode = (node as any).emitNode;
                return enumDecl;
            }
            break;
        }
    }
    return node;
}

export const transformer = createTransformer(visitor);
