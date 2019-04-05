import { createCompilerHost } from './Host';
import { transformers } from './transformers/index';
import { templates } from './templates/index';
import { EmitResultWithDts, createProgram } from './Program';
import { createProgram as createBundlerProgram } from './BundlerProgram';

export {
    EmitResultWithDts,
    transformers,
    templates,
    createCompilerHost,
    createProgram,
    createBundlerProgram,
};
