<h1 align="center">DTS ApiGen</h1>

<p align="center">
    <a href="https://github.com/chialab/dts-apigen">
        <img alt="Source link" src="https://img.shields.io/badge/Source-GitHub-lightgrey.svg?style=flat-square">
    </a>
    <a href="https://www.chialab.it">
        <img alt="Authors link" src="https://img.shields.io/badge/Authors-Chialab-lightgrey.svg?style=flat-square">
    </a>
    <a href="https://www.npmjs.com/package/dts-apigen">
        <img alt="NPM" src="https://img.shields.io/npm/v/dts-apigen.svg?style=flat-square">
    </a>
    <a href="https://github.com/chialab/dts-apigen/blob/master/LICENSE">
        <img alt="License" src="https://img.shields.io/npm/l/dts-apigen.svg?style=flat-square">
    </a>
</p>

A `.d.ts` and documentation generator for TypeScript and JavaScript projects.

> ⚠️ Please note that DTS ApiGen is still in beta and not production ready.

### Why

TypeScript is a powerful tool, but at the moment of writing, [it prevents declaration files](https://github.com/Microsoft/TypeScript/issues/7546) generation for JavaScript files.

This tool aims to offer a set of utils to generate `.d.ts` files starting from JS modules using JSDoc ([checkout](#supported-tags) the supported tags list) to fill typings informations. It also provides a method to generate a single bundled declaration, useful for JS libraries and Api documentation.

## Usage

### Via CLI

DTS ApiGen is available as a CLI tool installing the module via NPM or Yarn:
```sh
$ npm install -g dts-apigen
# OR
$ yarn global add dts-apigen
```

```
$ dts-apigen --help

Usage: dts-apigen [options] [command]

Options:
  -V, --version                 output the version number
  -h, --help                    output usage information

Commands:
  generate [options] <file>     Generate declaration files
  bundle [options] <file>       Bundle all declaration files into a single .d.ts file
  documentate [options] <file>  Generate an API documentation markdown file
```

The `generate` command creates declaration files along your source files, unless a `declarationDir` has been specified in the `tsconfig.json` or the `--out` option has been used:
```sh
$ dts-apigen generate src/index.js --out types/
```
You can also build a single `.d.ts` file running:
```sh
$ dts-apigen bundle src/index.js --out typings.d.ts
```

The `documentate` command generates a bundle of the project on the fly and passes the typescript `SourceFile` result to a template function (by default it uses the built-in markdown generator):
``` sh
$ dts-apign documentate src/index.js --out docs/API.md
```

### Via Node

Install the package as Node dependency to use it programmatically:
```sh
$ npm install dts-apigen -D
# OR
$ yarn add dts-apigen -D
```

DTS ApiGen extends the TypeScript `createProgram` method and accepts all its options, as well as other custom transformers.

```js
const { generate, bundle } = require('dts-apigen');
const { writeFileSync } = require('fs');
const { createPrinter } = require('typescript');

const result = generate(['src/index.js'], {
    declarationDir: 'types',
});

console.log(result.diagnostic);

// generate the bundle file
const sourceFile = bundle('src/index.js');
const code = createPrinter().printFile(resultFile);
writeFileSync('bundle.d.ts', code);
```

You can find the API documentation (generated with `dts-apigen`, of course) in the [API.md](./API.md) file.

## Supported tags

* @abstract
* @access
* @async
* @const
* @enum
* @param
* @private
* @property (synonyms: @prop)
* @protected
* @readonly
* @return
* @typedef

### Partially supported tags
* @kind
* @namespace (only for declarations)

<!-- ### Unsupported tags (right now...)
* @augments (synonyms: @extends)
* @callback
* @class (synonyms: @constructor)
* @constructs
* @default (synonyms: @defaultvalue)
* @exports
* @external (synonyms: @host)
* @function (synonyms: @func, @method)
* @generator
* @global
* @implements
* @inner
* @instance
* @interface
* @member (synonyms: @var)
* @memberof
* @mixes
* @mixin
* @module
* @name
* @package
* @requires
* @static
* @this
* @type
* @variation
* @yields (synonyms: @yield) -->

---

## License

DTS ApiGen is released under the [MIT](https://github.com/chialab/dna/blob/master/LICENSE) license.