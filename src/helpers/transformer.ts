import { Node, visitEachChild, TransformerFactory, SourceFile, TransformationContext } from 'typescript';

export type Visitor = (node: Node) => Node;

/**
 * Recursively visit AST nodes
 * @param node The node to iterate
 * @param visitor The visitor function
 * @return The updated node reference
 */
export function visitNodeAndChildren(node: SourceFile, visitor: Visitor, context: TransformationContext): SourceFile;
export function visitNodeAndChildren(node: Node, visitor: Visitor, context: TransformationContext): Node;
export function visitNodeAndChildren(node: Node, visitor: Visitor, context: TransformationContext): Node {
    return visitEachChild(visitor(node), (childNode) => visitNodeAndChildren(childNode, visitor, context), context);
}

/**
 * Create a transformer from a visitor function
 * @param visitor The visitor function
 * @return A transformer function
 */
export function createTransformer(visitor: Visitor): TransformerFactory<SourceFile> {
    return (context: TransformationContext) => (file: SourceFile) => visitNodeAndChildren(file, visitor, context);
}