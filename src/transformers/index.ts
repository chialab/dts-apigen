import { TransformerFactory, SourceFile } from 'typescript';
import { transformer as ImportTransformer } from './ImportTransformer';
import { transformer as TypedefTransformer } from './TypedefTransformer';
import { transformer as NamespaceTransformer } from './NamespaceTransformer';
import { transformer as AccessTransformer } from './AccessTransformer';
import { transformer as FunctionTransformer } from './FunctionTransformer';
import { transformer as EnumTransformer } from './EnumTransformer';
import { transformer as VariableTransformer } from './VariableTransformer';

/**
 * The full list of JSDoc transformers.
 */
export const transformers: TransformerFactory<SourceFile>[] = [
    ImportTransformer,
    TypedefTransformer,
    NamespaceTransformer,
    AccessTransformer,
    FunctionTransformer,
    EnumTransformer,
    VariableTransformer,
];
