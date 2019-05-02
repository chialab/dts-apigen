import { ImportTransformer } from './transformers/ImportTransformer';
import { TypedefTransformer } from './transformers/TypedefTransformer';
import { NamespaceTransformer } from './transformers/NamespaceTransformer';
import { AccessTransformer } from './transformers/AccessTransformer';
import { EnumTransformer } from './transformers/EnumTransformer';
import { PropertyTransformer } from './transformers/PropertyTransformer';
import { ThisTransformer } from './transformers/ThisTransformer';
import { VariableTransformer } from './transformers/VariableTransformer';

export const plugins = [
    ImportTransformer,
    TypedefTransformer,
    NamespaceTransformer,
    AccessTransformer,
    EnumTransformer,
    PropertyTransformer,
    ThisTransformer,
    VariableTransformer,
];
