import { SourceFile, createPrinter } from 'typescript';

export function printFile(sourceFile: SourceFile) {
    const printer = createPrinter();
    return sourceFile.statements
        .map((node) => printer.printNode(4, node, node.getSourceFile() || sourceFile))
        .join('\n\n');
}