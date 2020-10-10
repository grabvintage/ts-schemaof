const transformer = require('./transformer').default;

module.exports = {
  name: 'schemaof',
  version: 1,
  factory: (cs) => (context) => transformer(cs.tsCompiler.program)(context),
};
