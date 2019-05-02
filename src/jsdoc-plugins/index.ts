import { ImportTransformer } from './transformers/ImportTransformer';
import { TypedefTransformer } from './transformers/TypedefTransformer';
import { NamespaceTransformer } from './transformers/NamespaceTransformer';
import { AccessTransformer } from './transformers/AccessTransformer';
import { EnumTransformer } from './transformers/EnumTransformer';
import { VariableTransformer } from './transformers/VariableTransformer';

export const plugins = [
    ImportTransformer,
    TypedefTransformer,
    NamespaceTransformer,
    AccessTransformer,
    EnumTransformer,
    VariableTransformer,
];
