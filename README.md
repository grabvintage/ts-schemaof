# `ts-schemaof`

Get a JSON schema of your TypeScript interface at compile time.

```shell
$ npm install @grabvintage/ts-schemaof --save-dev
```

## Setup

##### TypeScript

You need to use `ttsc` or any other TypeScript compiler that supports plugins. Once you have that, add a new plugin definition to your `tsconfig.json`:

```js
{
  "compilerOptions": {
    ...
    "plugins": [{ "transform": "@grabvintage/ts-schemaof" }]
  }
}
```

#### Webpack

You need to use `ts-loader` and supply it with a custom `before` transformer:

```js
const TsSchemaofTransformer = require('@grabvintage/ts-schemaof').default;

module.exports = {
  ...
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          'babel-loader',
          {
            loader: 'ts-loader',
            options: {
              getCustomTransformers: (program) => ({
                before: [TsSchemaofTransformer(program)],
              }),
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
};
```

## Usage

```ts
import Ajv from 'ajv';

type FooBar = {
  foo: string;
  bar: string;
};

const ajv = new Ajv({ removeAdditional: 'all' });
const validate = ajv.compile(schemaof<FooBar>());

validate({ foo: 'foo', bar: 'bar' }); // passes!
```
