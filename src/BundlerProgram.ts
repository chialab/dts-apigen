import { resolve, join, dirname } from 'path';
import { createProgram as tsCreateProgram, Program, CompilerOptions, CompilerHost, Diagnostic, SourceFile, WriteFileCallback, CancellationToken, CustomTransformers } from 'typescript';
import { Extractor, ExtractorConfig } from '@microsoft/api-extractor';
import { createProgram as apigenCreateProgram, EmitResultWithDts } from './Program';
import { rmdir } from './helpers';

/**
 * Create a TypeScript program for bundle generation
 * @param fileNames A list of sources to bundle
 * @param options The TypeScript compiler options
 * @return A TypeScript program
 */
export function createProgram(fileNames: ReadonlyArray<string>, options: CompilerOptions, host?: CompilerHost, oldProgram?: Program, configFileParsingDiagnostics?: ReadonlyArray<Diagnostic>): Program {
    // create a temporary folder for declarations generation
    const tempDeclarationDir = join(process.cwd(), '.apigen');

    // override the declaration dir in compiler options
    const compilerOptions = Object.assign({}, options, {
        declarationDir: tempDeclarationDir,
    });

    // create a pogram with custom transformers
    const program = apigenCreateProgram(fileNames, compilerOptions, host, oldProgram, configFileParsingDiagnostics);

    // override the emit method to inject bundle generation
    const originalEmit = program.emit;
    program.emit = (targetSourceFile?: SourceFile, writeFile?: WriteFileCallback, cancellationToken?: CancellationToken, emitDeclarationOnly?: boolean, customTransformers?: CustomTransformers): EmitResultWithDts => {
        try {
            // retrieve results
            const result: EmitResultWithDts = originalEmit.call(program, targetSourceFile, writeFile, cancellationToken, emitDeclarationOnly, customTransformers);

            // the last emitted file is the required entry point for the bundle
            const entryPointSourceFile = result.emittedFiles[result.emittedFiles.length - 1];
            // get the output path for the bundle
            // if undefined, generate it in the temp directory in order to retrieve bundle information
            const outputFile = (compilerOptions.outputFile as string) || join(tempDeclarationDir, 'bundle.d.ts');

            // setup and run the extractor
            const extractorConfig = ExtractorConfig.prepare({
                configObject: {
                    mainEntryPointFile: entryPointSourceFile,
                    compiler: {
                        rootFolder: program.getCompilerOptions().rootDir,
                    },
                    tsdocMetadata: {
                        enabled: false,
                    },
                    dtsRollup: {
                        enabled: true,
                        untrimmedFilePath: outputFile,
                    },
                },
                configObjectFullPath: undefined,
                packageJsonFullPath: result.packageJsonPath,
            });
            Extractor.invoke(extractorConfig, {
                localBuild: true,
                customLogger: {
                    logVerbose: (message: string) => { /* don't log verbose messages */ },
                    logWarning: (message: string) => { /* don't log verbose messages */ },
                }
            });

            // retrieve the typechecked source file for the bundle
            const extractorProgram = tsCreateProgram([outputFile], {});
            extractorProgram.emit(undefined, () => {}, undefined, true);
            result.dts = [extractorProgram.getSourceFile(outputFile)];

            // clenup
            rmdir(tempDeclarationDir);

            return result;
        } catch (error) {
            // always clenup
            rmdir(tempDeclarationDir);
            throw error;
        }
    };

    return program;
}
