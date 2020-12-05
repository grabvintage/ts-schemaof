import { transformer } from './transformer';

export = {
  default: transformer,
  factory: (cs: any) => (context: any) => transformer(cs.tsCompiler.program)(context),
  name: 'schemaof',
  schemaof: <T>(): any => {
    throw new Error('Calling schemaof at runtime is forbidden');
  },
  version: 1,
};
