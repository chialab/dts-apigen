import { Node, SyntaxKind, ImportDeclaration, isStringLiteral, createStringLiteral } from 'typescript';
import { createTransformer } from '../helpers';
import { basename, extname, dirname, join } from 'path';

export function visitor(node: Node): Node {
    switch (node.kind) {
        case SyntaxKind.ImportDeclaration:
        case SyntaxKind.ExportDeclaration: {
            let specifier = (node as ImportDeclaration).moduleSpecifier;
            if (specifier && isStringLiteral(specifier)) {
                let file = specifier.getText();
                file = file.substr(1, file.length - 2).replace(/\.[^\/\\]*$/, '');
                (node as ImportDeclaration).moduleSpecifier = createStringLiteral(file);
            }
            break;
        }
    }
    return node;
}

export const transformer = createTransformer(visitor);
