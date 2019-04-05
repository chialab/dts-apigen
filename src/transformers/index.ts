import { TransformerFactory, SourceFile } from 'typescript';
import { transformer as AccessTransformer } from './AccessTransformer';
import { transformer as FunctionTransformer } from './FunctionTransformer';
import { transformer as VariableTransformer } from './VariableTransformer';

/**
 * The full list of JSDoc transformers.
 */
export const transformers: TransformerFactory<SourceFile>[] = [
    AccessTransformer,
    FunctionTransformer,
    VariableTransformer,
];
