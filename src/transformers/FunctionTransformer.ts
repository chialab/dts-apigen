import { SyntaxKind, Node, FunctionExpression, ParameterDeclaration, getJSDocReturnType, getJSDocParameterTags, createToken, VariableDeclaration, createFunctionTypeNode, createTypeReferenceNode, createIdentifier, createKeywordTypeNode } from 'typescript';
import { getOriginalNode, createTransformer, getTagByName } from '../helpers';

function handleParam(node: FunctionExpression, param: ParameterDeclaration) {
    let originalParam = getOriginalNode(param) as ParameterDeclaration;
    let jsDocParam = getJSDocParameterTags(originalParam).find((entry) => entry.name.getText() === originalParam.name.getText());
    if (!jsDocParam) {
        return param;
    }
    if (!originalParam.type && jsDocParam.typeExpression) {
        if (jsDocParam.typeExpression.type.kind === SyntaxKind.JSDocAllType) {
            param.type = createKeywordTypeNode(SyntaxKind.AnyKeyword);
        } else {
            param.type = jsDocParam.typeExpression.type;
        }
    }
    if (!originalParam.questionToken && jsDocParam.isBracketed) {
        param.questionToken = createToken(SyntaxKind.QuestionToken);
    }
    return param;
}

function handleParams(node: FunctionExpression) {
    if (!node.parameters) {
        return node;
    }
    node.parameters.forEach((param) => handleParam(node, param));
}

function handleReturn(node: FunctionExpression) {
    let originalNode = getOriginalNode(node) as FunctionExpression;
    if (originalNode.type) {
        return node;
    }
    let jsDocType = getJSDocReturnType(originalNode);
    if (!jsDocType && getTagByName(originalNode, 'async')) {
        let anyType = createKeywordTypeNode(SyntaxKind.AnyKeyword);
        let idType = createIdentifier('Promise');
        let type = createTypeReferenceNode(idType, [anyType]);
        idType.parent = type;
        type.parent = node;
        jsDocType = type;
    }
    if (jsDocType) {
        if (jsDocType.kind === SyntaxKind.JSDocAllType) {
            node.type = createKeywordTypeNode(SyntaxKind.AnyKeyword);
        } else {
            node.type = jsDocType;
        }
    }
}

export function visitor(node: Node): Node {
    switch (node.kind) {
        case SyntaxKind.ArrowFunction:
        case SyntaxKind.Constructor:
        case SyntaxKind.FunctionDeclaration:
        case SyntaxKind.FunctionExpression:
        case SyntaxKind.MethodDeclaration:
        case SyntaxKind.MethodSignature: {
            handleParams(node as FunctionExpression);
            handleReturn(node as FunctionExpression);
            break;
        }
        case SyntaxKind.VariableDeclaration: {
            if (!(node as VariableDeclaration).type) {
                if (!(node as VariableDeclaration).initializer) {
                    break;
                }
                let fn = visitor((node as VariableDeclaration).initializer);
                switch (fn.kind) {
                    case SyntaxKind.ArrowFunction:
                    case SyntaxKind.FunctionExpression:
                    case SyntaxKind.FunctionDeclaration: {
                        (node as VariableDeclaration).type = createFunctionTypeNode(
                            undefined,
                            (fn as FunctionExpression).parameters,
                            (fn as FunctionExpression).type
                        );
                        break;
                    }
                }
            }
            break;
        }
    }
    return node;
}

export const transformer = createTransformer(visitor);
