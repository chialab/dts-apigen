import { createCompilerHost } from './Host';
import { templates } from './templates/index';
import { generate } from './generate';
import { collect } from './collect';
import { bundle } from './bundle';
import { createProgram } from './Program';

export {
    createCompilerHost,
    createProgram,
    generate,
    collect,
    bundle,
    templates,
};
