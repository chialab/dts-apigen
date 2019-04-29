import { CompilerOptions, EmitResult } from 'typescript';
import { createProgram } from './Program';

/**
 * Generate .d.ts files for TypeScript and/or JavaScript files.
 * @param fileNames A list of code files.
 * @param options The TypeScript compiler options to use.
 * @return The result of a TypeScript program emit.
 * 
 * @example
 * ```ts
 * import { generate } from 'dts-apigen';
 * 
 * const result = generate(['src/index.ts'], { declarationDir: 'types' });
 * if (result.emitSkipped) {
 *     throw new Error('ops!');
 * }
 * ```
 */
export function generate(fileNames: string[], options: CompilerOptions): EmitResult {
    return createProgram(fileNames, options).emit();
}
