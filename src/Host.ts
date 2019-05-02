import { CompilerOptions, CompilerHost, createCompilerHost as tsCreateCompilerHost, SyntaxKind, SourceFile, createSourceFile, isSourceFile } from 'typescript';
import { transformSync } from '@babel/core';

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
        let source: SourceFile = originalGetSourceFile.call(host, fileName, languageVersion, onError, shouldCreateNewSourceFile);
        if (source && isSourceFile(source) && !source.isDeclarationFile) {
            let isJavaScript = !!(source.flags & 65536);
            let content = source.text;
            if (isJavaScript) {
                try {
                    let result = transformSync(content, {
                        filename: fileName,
                        plugins: [
                            require('@cureapp/babel-plugin-flow-to-typescript'),
                        ],
                    });
                    content = result.code;
                } catch (error) {
                    //
                }
            }
            try {
                let result = transformSync(content, {
                    filename: fileName,
                    plugins: [
                        require('@babel/plugin-syntax-jsx'),
                        require('@babel/plugin-syntax-typescript'),
                        ...(require('./jsdoc-plugins/index').plugins),
                    ],
                });
                content = result.code;
            } catch (error) {
                console.error('Unable to run JSDoc transformers', error);
            }

            source = createSourceFile(fileName, content, languageVersion, true);
            source.flags = 0;
        }
        return source;
    }

    return host;
}
