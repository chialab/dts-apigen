import { existsSync } from 'fs';
import { resolve, join } from 'path';
import { createProgram as tsCreateProgram, CompilerOptions, CompilerHost, Program, Diagnostic, SourceFile, WriteFileCallback, CancellationToken, CustomTransformers, flattenDiagnosticMessageText, ScriptTarget, getPreEmitDiagnostics, ModuleResolutionKind, getParsedCommandLineOfConfigFile, findConfigFile, sys } from 'typescript';
import { createCompilerHost } from './Host';
import { transformers } from './transformers/index';

/**
 * Create a TypeScript program with custom transformers and custom resolution for JS files
 * @param fileNames A list of sources to transform
 * @param options The TypeScript compiler options
 * @return A TypeScript program
 */
export function createProgram(fileNames: ReadonlyArray<string>, options: CompilerOptions, host?: CompilerHost, oldProgram?: Program, configFileParsingDiagnostics?: ReadonlyArray<Diagnostic>): Program {
    // normalize files names
    fileNames = fileNames.map((fileName) => resolve(process.cwd(), fileName));

    // load tsconfig.json
    const configFile = findConfigFile(fileNames[0], existsSync);
    let config = options;
    if (configFile) {
        let host = Object.assign(
            {
                onUnRecoverableConfigFileDiagnostic: () => { },
            },
            sys
        );
        let parsed = getParsedCommandLineOfConfigFile(configFile, options, host);
        config = parsed.options;
    }

    // setup compiler options
    const compilerOptions: CompilerOptions = Object.assign(
        {
            target: ScriptTarget.ESNext,
            moduleResolution: ModuleResolutionKind.NodeJs,
            rootDir: process.cwd(),
        },
        config,
        {
            declaration: true,
            emitDeclarationOnly: false,
            allowJs: true,
            allowNonTsExtensions: true,
            listEmittedFiles: true,
            noEmitOnError: true,
        }
    );

    /**
     * A map of generated declaration files.
     */
    const filesMap: { [key: string]: string } = {};

    // generate the custom compiler host to correctly load JS files.
    const compilerHost = createCompilerHost(compilerOptions, true, host);
    // create the TypeScript program
    const program = tsCreateProgram(fileNames, compilerOptions, compilerHost, oldProgram, configFileParsingDiagnostics);

    // override the default emit method in order to inject custom transformers, collect generated declaration files and analyze the output
    const originalEmit = program.emit;
    program.emit = (targetSourceFile?: SourceFile, writeFile?: WriteFileCallback, cancellationToken?: CancellationToken, emitDeclarationOnly?: boolean, customTransformers?: CustomTransformers) => {
        // setup custom transformers
        customTransformers = customTransformers || {};
        customTransformers.afterDeclarations = customTransformers.afterDeclarations || [];
        customTransformers.afterDeclarations.push(...transformers);

        const collectWriteFile = (fileName: string, data: string, writeByteOrderMark: boolean, onError?: (message: string) => void, sourceFiles?: ReadonlyArray<SourceFile>) => {
            filesMap[resolve(compilerOptions.rootDir, fileName)] = data;
            if (writeFile) {
                return writeFile(fileName, data, writeByteOrderMark, onError, sourceFiles);
            }
            return compilerHost.writeFile(fileName, data, writeByteOrderMark, onError, sourceFiles);
        };

        // call the original emit method and print diagnostic
        const result = originalEmit.call(program, targetSourceFile, collectWriteFile, cancellationToken, true, customTransformers);
        const allDiagnostics = getPreEmitDiagnostics(program).concat(result.diagnostics);
        if (result.emitSkipped) {
            allDiagnostics.forEach((diagnostic) => {
                if (diagnostic.file) {
                    let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
                        diagnostic.start!
                    );
                    let message = flattenDiagnosticMessageText(diagnostic.messageText, '\n');
                    console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
                } else {
                    console.log(`${flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`);
                }
            });
            throw new Error('emit skipped');
        }

        return result;
    };

    return program;
}