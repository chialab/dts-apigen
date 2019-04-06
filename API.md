# dts-apigen

## Summary






**Methods**

[createBundlerProgram](#createBundlerProgram), [createCompilerHost](#createCompilerHost), [createProgram](#createProgram)


**Constants**

[templates](#templates), [transformers](#transformers)


**Types**

[EmitResultWithDts](#EmitResultWithDts), [TemplateFactory](#TemplateFactory), [TemplateOptions](#TemplateOptions) 



---

### createBundlerProgram

Create a TypeScript program for bundle generation

<details>
<summary>
<code>(fileNames: ReadonlyArray<string>, options: CompilerOptions, host?: CompilerHost, oldProgram?: Program, configFileParsingDiagnostics?: ReadonlyArray<Diagnostic>): Program</code>
</summary>

**Params**

| Name | Type | Optional | Description |
| ---- | ---- | :------: | ----------- |
| fileNames | <code>ReadonlyArray<string></code> |  | A list of sources to bundle |
| options | <code>CompilerOptions</code> |  | The TypeScript compiler options |
| host | <code>CompilerHost</code> | ✓ |  |
| oldProgram | <code>Program</code> | ✓ |  |
| configFileParsingDiagnostics | <code>ReadonlyArray<Diagnostic></code> | ✓ |  |

**Returns**: <code>Program</code> A TypeScript program

</details>




---

### createCompilerHost

Create a custom CompilerHost that treats JS files as regular TS files in order to generate declarations.

<details>
<summary>
<code>(options: CompilerOptions, setParentNodes?: boolean, oldHost?: CompilerHost): CompilerHost</code>
</summary>

**Params**

| Name | Type | Optional | Description |
| ---- | ---- | :------: | ----------- |
| options | <code>CompilerOptions</code> |  | The CompilerOptions to use |
| setParentNodes | <code>boolean</code> | ✓ |  |
| oldHost | <code>CompilerHost</code> | ✓ |  |

**Returns**: <code>CompilerHost</code> 

</details>




---

### createProgram

Create a TypeScript program with custom transformers and custom resolution for JS files

<details>
<summary>
<code>(fileNames: ReadonlyArray<string>, options: CompilerOptions, host?: CompilerHost, oldProgram?: Program, configFileParsingDiagnostics?: ReadonlyArray<Diagnostic>): Program</code>
</summary>

**Params**

| Name | Type | Optional | Description |
| ---- | ---- | :------: | ----------- |
| fileNames | <code>ReadonlyArray<string></code> |  | A list of sources to transform |
| options | <code>CompilerOptions</code> |  | The TypeScript compiler options |
| host | <code>CompilerHost</code> | ✓ |  |
| oldProgram | <code>Program</code> | ✓ |  |
| configFileParsingDiagnostics | <code>ReadonlyArray<Diagnostic></code> | ✓ |  |

**Returns**: <code>Program</code> A TypeScript program

</details>




---

### templates

A list of template factories for documentation generation.



**Type:**

<code><pre>{
&nbsp;&nbsp;&nbsp;&nbsp;[key:&nbsp;string]:&nbsp;[TemplateFactory](#TemplateFactory)<[TemplateOptions](#TemplateOptions)>;
}</pre></code>


---

### transformers

The full list of JSDoc transformers.



**Type:**

<code><pre>TransformerFactory<SourceFile>[]</pre></code>


---

### EmitResultWithDts

The result of the program emit
Implements the typescript EmitResult with some extra fields like `dts`, `packageJsonPath` and `packageJson`



<code><pre>EmitResult&nbsp;&&nbsp;{
&nbsp;&nbsp;&nbsp;&nbsp;dts:&nbsp;ReadonlyArray<SourceFile>;
&nbsp;&nbsp;&nbsp;&nbsp;packageJsonPath:&nbsp;string;
&nbsp;&nbsp;&nbsp;&nbsp;packageJson:&nbsp;IPackageJson;
}</pre></code>


---

### TemplateFactory

A function that generate documentation using source files, package json data and template options.



<code><pre>(sourceFiles:&nbsp;SourceFile[],&nbsp;packageJson:&nbsp;IPackageJson,&nbsp;options:&nbsp;T):&nbsp;void</pre></code>


---

### TemplateOptions

The options to pass to the template generator.
`out` property is always required.



<code><pre>{
&nbsp;&nbsp;&nbsp;&nbsp;out:&nbsp;string;
&nbsp;&nbsp;&nbsp;&nbsp;[key:&nbsp;string]:&nbsp;any;
}</pre></code>
