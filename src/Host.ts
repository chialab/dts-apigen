import { CompilerOptions, CompilerHost, createCompilerHost as tsCreateCompilerHost, SyntaxKind } from 'typescript';

/**
 * Create a custom CompilerHost that treats JS files as regular TS files in order to generate declarations.
 * @param options The CompilerOptions to use
 */
export function createCompilerHost(options: CompilerOptions, setParentNodes?: boolean, oldHost?: CompilerHost) {
    // create a new compiler host if not passed
    const host = oldHost || tsCreateCompilerHost(options, setParentNodes);

    // override getSourceFile
    const originalGetSourceFile = host.getSourceFile;
    host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
        let source = originalGetSourceFile.call(host, fileName, languageVersion, onError, shouldCreateNewSourceFile);
        if (source) {
            switch (source.kind) {
                case SyntaxKind.SourceFile: {
                    if (!!(source.flags & 65536)) { // js file detected, reset flags
                        source.flags = 0;
                    }
                    break;
                }
            }
        }
        return source;
    }

    return host;
}
