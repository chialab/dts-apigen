# DTS Apigen


<table width="100%">






<thead><th>Methods</th></thead>

<tbody>
    <tr>
        <td>
<a href="#createCompilerHost">createCompilerHost</a>, <a href="#createProgram">createProgram</a>, <a href="#generate">generate</a>, <a href="#collect">collect</a>, <a href="#bundle">bundle</a>
        </td>
    </tr>
</tbody>


<thead><th>Constants</th></thead>

<tbody>
    <tr>
        <td>
            <a href="#transformers">transformers</a>, <a href="#templates">templates</a>
        </td>
    </tr>
</tbody>



</table>



<hr />

<details>
<summary><strong><img src="https://img.shields.io/badge/method-FF7900.svg?style=flat-square" alt="namespace badge" align="top" /> createCompilerHost</strong></summary>

<p>Create a custom CompilerHost that treats JS files as regular TS files in order to generate declarations.</p>

<details>
<summary>
<code>(options: CompilerOptions), setParentNodes?: boolean), oldHost?: CompilerHost)): CompilerHost</code>
</summary>

<strong>Params</strong>

<table>
    <thead>
        <th>Name</th>
        <th>Type</th>
        <th>Optional</th>
        <th>Description</th>
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
<summary><strong><img src="https://img.shields.io/badge/method-FF7900.svg?style=flat-square" alt="namespace badge" align="top" /> createProgram</strong></summary>

<p>Create a TypeScript program with custom transformers and custom resolution for JS files</p>

<details>
<summary>
<code>(fileNames: ReadonlyArray&lt;string&gt;), options: CompilerOptions), host?: CompilerHost), oldProgram?: Program), configFileParsingDiagnostics?: ReadonlyArray&lt;Diagnostic&gt;)): Program</code>
</summary>

<strong>Params</strong>

<table>
    <thead>
        <th>Name</th>
        <th>Type</th>
        <th>Optional</th>
        <th>Description</th>
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
<summary><strong><img src="https://img.shields.io/badge/method-FF7900.svg?style=flat-square" alt="namespace badge" align="top" /> generate</strong></summary>

<p></p>

<details>
<summary>
<code>(fileNames: string[]), options: CompilerOptions)): EmitResult</code>
</summary>

<strong>Params</strong>

<table>
    <thead>
        <th>Name</th>
        <th>Type</th>
        <th>Optional</th>
        <th>Description</th>
    </thead>
    <tbody>
        <tr>
            <td>fileNames</td>
            <td><code>string[]</code></td>
            <td align="center"></td>
            <td></td></tr>
<tr>
            <td>options</td>
            <td><code>CompilerOptions</code></td>
            <td align="center"></td>
            <td></td>
        </tr>
    </tbody>
</table>

<strong>Returns</strong>: <code>EmitResult</code> 

</details>



</details>

<hr />

<details>
<summary><strong><img src="https://img.shields.io/badge/method-FF7900.svg?style=flat-square" alt="namespace badge" align="top" /> collect</strong></summary>

<p></p>

<details>
<summary>
<code>(fileName: string)): {
    symbols: Symbol[];
    exported: Symbol[];
    references: Map&lt;Symbol, Identifier[]&gt;;
    typechecker: TypeChecker;
}</code>
</summary>

<strong>Params</strong>

<table>
    <thead>
        <th>Name</th>
        <th>Type</th>
        <th>Optional</th>
        <th>Description</th>
    </thead>
    <tbody>
        <tr>
            <td>fileName</td>
            <td><code>string</code></td>
            <td align="center"></td>
            <td></td>
        </tr>
    </tbody>
</table>

<strong>Returns</strong>: <code>{     symbols: Symbol[];     exported: Symbol[];     references: Map&lt;Symbol, Identifier[]&gt;;     typechecker: TypeChecker; }</code> 

</details>



</details>

<hr />

<details>
<summary><strong><img src="https://img.shields.io/badge/method-FF7900.svg?style=flat-square" alt="namespace badge" align="top" /> bundle</strong></summary>

<p></p>

<details>
<summary>
<code>(fileName: string)): SourceFile</code>
</summary>

<strong>Params</strong>

<table>
    <thead>
        <th>Name</th>
        <th>Type</th>
        <th>Optional</th>
        <th>Description</th>
    </thead>
    <tbody>
        <tr>
            <td>fileName</td>
            <td><code>string</code></td>
            <td align="center"></td>
            <td></td>
        </tr>
    </tbody>
</table>

<strong>Returns</strong>: <code>SourceFile</code> 

</details>



</details>

<hr />

<details>
<summary><strong><img src="https://img.shields.io/badge/constant-1FBF44.svg?style=flat-square" alt="namespace badge" align="top" /> transformers</strong></summary>

<p>The full list of JSDoc transformers.</p>



<strong>Type:</strong>

<pre>TransformerFactory&lt;SourceFile&gt;[]</pre>

</details>

<hr />

<details>
<summary><strong><img src="https://img.shields.io/badge/constant-1FBF44.svg?style=flat-square" alt="namespace badge" align="top" /> templates</strong></summary>

<p>A list of template factories for documentation generation.</p>



<strong>Type:</strong>

<pre>{
    [key: string]: <a href="#TemplateFactory">TemplateFactory</a>&lt;<a href="#TemplateOptions">TemplateOptions</a>&gt;;
}</pre>

</details>

<hr />

<details>
<summary><strong><img src="https://img.shields.io/badge/type-BF1FAC.svg?style=flat-square" alt="namespace badge" align="top" /> TemplateOptions</strong></summary>

<p>The options to pass to the template generator.
`out` property is always required.</p>



<pre>{
    out: string;
    [key: string]: any;
}</pre>

</details>

<hr />

<details>
<summary><strong><img src="https://img.shields.io/badge/type-BF1FAC.svg?style=flat-square" alt="namespace badge" align="top" /> TemplateFactory</strong></summary>

<p>A function that generate documentation using source files, package json data and template options.</p>



<pre>(sourceFile: SourceFile, options: T): void</pre>

</details>