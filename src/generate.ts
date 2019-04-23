import { CompilerOptions } from 'typescript';
import { createProgram } from './Program';

export function generate(fileNames: string[], options: CompilerOptions) {
    return createProgram(fileNames, options).emit();
}
