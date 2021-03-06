# DTS Apigen







**Methods**

<a href="#createcompilerhost">createCompilerHost</a>, <a href="#createprogram">createProgram</a>, <a href="#generate">generate</a>, <a href="#collect">collect</a>, <a href="#bundle">bundle</a>


**Constants**

<a href="#templates">templates</a>






<hr />

<details>
<summary><strong id="createcompilerhost"><code>method</code>  createCompilerHost</strong></summary><br />



<p>

Create a custom CompilerHost that treats JS files as regular TS files in order to generate declarations.

</p>

<details>
<summary>
<code>(options: CompilerOptions), setParentNodes?: boolean), oldHost?: CompilerHost)): CompilerHost</code>
</summary><br />

<strong>Params</strong>

<table>
    <thead>
        <th align="left">Name</th>
        <th align="left">Type</th>
        <th align="center">Optional</th>
        <th align="left">Description</th>
    </thead>
    <tbody>
        <tr>
            <td>options</td>
            <td><code>CompilerOptions</code></td>
            <td align="center"></td>
            <td>The CompilerOptions to use</td></tr>
<tr>
            <td>setParentNodes</td>
            <td><code>boolean</code></td>
            <td align="center">✓</td>
            <td></td></tr>
<tr>
            <td>oldHost</td>
            <td><code>CompilerHost</code></td>
            <td align="center">✓</td>
            <td></td>
        </tr>
    </tbody>
</table>

<strong>Returns</strong>: <code>CompilerHost</code> 

</details>





</details>

<hr />

<details>
<summary><strong id="createprogram"><code>method</code>  createProgram</strong></summary><br />



<p>

Create a TypeScript program with custom transformers and custom resolution for JS files

</p>

<details>
<summary>
<code>(fileNames: ReadonlyArray&lt;string&gt;), options: CompilerOptions), host?: CompilerHost), oldProgram?: Program), configFileParsingDiagnostics?: ReadonlyArray&lt;Diagnostic&gt;)): Program</code>
</summary><br />

<strong>Params</strong>

<table>
    <thead>
        <th align="left">Name</th>
        <th align="left">Type</th>
        <th align="center">Optional</th>
        <th align="left">Description</th>
    </thead>
    <tbody>
        <tr>
            <td>fileNames</td>
            <td><code>ReadonlyArray&lt;string&gt;</code></td>
            <td align="center"></td>
            <td>A list of sources to transform</td></tr>
<tr>
            <td>options</td>
            <td><code>CompilerOptions</code></td>
            <td align="center"></td>
            <td>The TypeScript compiler options</td></tr>
<tr>
            <td>host</td>
            <td><code>CompilerHost</code></td>
            <td align="center">✓</td>
            <td></td></tr>
<tr>
            <td>oldProgram</td>
            <td><code>Program</code></td>
            <td align="center">✓</td>
            <td></td></tr>
<tr>
            <td>configFileParsingDiagnostics</td>
            <td><code>ReadonlyArray&lt;Diagnostic&gt;</code></td>
            <td align="center">✓</td>
            <td></td>
        </tr>
    </tbody>
</table>

<strong>Returns</strong>: <code>Program</code> A TypeScript program

</details>





</details>

<hr />

<details>
<summary><strong id="generate"><code>method</code>  generate</strong></summary><br />



<p>

Generate .d.ts files for TypeScript and/or JavaScript files.

</p>

<details>
<summary>
<code>(fileNames: string[]), options: CompilerOptions)): EmitResult</code>
</summary><br />

<strong>Params</strong>

<table>
    <thead>
        <th align="left">Name</th>
        <th align="left">Type</th>
        <th align="center">Optional</th>
        <th align="left">Description</th>
    </thead>
    <tbody>
        <tr>
            <td>fileNames</td>
            <td><code>string[]</code></td>
            <td align="center"></td>
            <td>A list of code files.</td></tr>
<tr>
            <td>options</td>
            <td><code>CompilerOptions</code></td>
            <td align="center"></td>
            <td>The TypeScript compiler options to use.</td>
        </tr>
    </tbody>
</table>

<strong>Returns</strong>: <code>EmitResult</code> The result of a TypeScript program emit.

</details>

<strong>Examples</strong>

```ts
 import { generate } from 'dts-apigen';

 const result = generate(['src/index.ts'], { declarationDir: 'types' });
 if (result.emitSkipped) {
     throw new Error('ops!');
 }
 ```



</details>

<hr />

<details>
<summary><strong id="collect"><code>method</code>  collect</strong></summary><br />



<p>

Collect typechecker symbols for a module.

</p>

<details>
<summary>
<code>(fileName: string)): {
    symbols: Symbol[];
    exported: Symbol[];
    references: Map&lt;Symbol, Identifier[]&gt;;
    typechecker: TypeChecker;
}</code>
</summary><br />

<strong>Params</strong>

<table>
    <thead>
        <th align="left">Name</th>
        <th align="left">Type</th>
        <th align="center">Optional</th>
        <th align="left">Description</th>
    </thead>
    <tbody>
        <tr>
            <td>fileName</td>
            <td><code>string</code></td>
            <td align="center"></td>
            <td>The module entry file.</td>
        </tr>
    </tbody>
</table>

<strong>Returns</strong>: <code>{     symbols: Symbol[];     exported: Symbol[];     references: Map&lt;Symbol, Identifier[]&gt;;     typechecker: TypeChecker; }</code> A set of data including all used symbols, exported symbols, references and the typechecker instance.

</details>

<strong>Examples</strong>

```ts
 import { collect } from 'dts-apigen';

 const { exported } = collect('src/index.ts');
 exported.forEach((exportedSymbol) => {
    console.log('exporting', exportedSymbol.getName());
 });
 ```



</details>

<hr />

<details>
<summary><strong id="bundle"><code>method</code>  bundle</strong></summary><br />



<p>

Create a bundled definition file for a module.

</p>

<details>
<summary>
<code>(fileName: string)): SourceFile</code>
</summary><br />

<strong>Params</strong>

<table>
    <thead>
        <th align="left">Name</th>
        <th align="left">Type</th>
        <th align="center">Optional</th>
        <th align="left">Description</th>
    </thead>
    <tbody>
        <tr>
            <td>fileName</td>
            <td><code>string</code></td>
            <td align="center"></td>
            <td>The module entry file.</td>
        </tr>
    </tbody>
</table>

<strong>Returns</strong>: <code>SourceFile</code> The generated source file with all exported symbols.

</details>

<strong>Examples</strong>

```ts
 import { createPrinter } from 'typescript';
 import { bundle } from 'dts-apigen';

 const sourceFile = bundle('src/index.ts');
 const code = createPrinter().printFile(resultFile);
 console.log(code);
 ```

<strong>See also</strong>

* <a href="#collect">collect</a> It uses the `collect` method to collect all required symbols.

</details>

<hr />

<details>
<summary><strong id="templates"><code>constant</code>  templates</strong></summary><br />



<p>

A list of template factories for documentation generation.

</p>



<strong>Type:</strong>

<pre>{
    [key: string]: <a href="#templatefactory">TemplateFactory</a>&lt;<a href="#templateoptions">TemplateOptions</a>&gt;;
}</pre>



</details>

<hr />

<details>
<summary><strong id="templateoptions"><code>type</code>  TemplateOptions</strong></summary><br />

<p>

The options to pass to the template generator.
`out` property is always required.

</p>



<pre>{
    out: string;
    [key: string]: any;
}</pre>



</details>

<hr />

<details>
<summary><strong id="templatefactory"><code>type</code>  TemplateFactory</strong></summary><br />

<p>

A function that generate documentation using source files, package json data and template options.

</p>



<pre>(sourceFile: SourceFile, options: T): void</pre>



</details>