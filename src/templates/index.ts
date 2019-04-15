import markdown = require('./markdown');
import { SourceFile } from 'typescript';

/**
 * The options to pass to the template generator.
 * `out` property is always required.
 */
export type TemplateOptions = {
    out: string;
    [key: string]: any;
};

/**
 * A function that generate documentation using source files, package json data and template options.
 * @param sourceFiles The typecheked source files for generated declaration files.
 * @param packageJson Package json data
 * @param options Template options
 */
export type TemplateFactory<T extends TemplateOptions> = (sourceFiles: SourceFile[], options: T) => void;

/**
 * A list of template factories for documentation generation.
 */
export const templates: { [key: string]: TemplateFactory<TemplateOptions> } = {
    markdown,
};