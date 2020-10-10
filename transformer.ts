import * as ts from 'typescript';
import * as tjs from 'typescript-json-schema';

export default (program: ts.Program) => {
  const typeChecker = program.getTypeChecker();

  const transformerFactory: ts.TransformerFactory<ts.SourceFile> = (context: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile) => {
      const visitor = (node: ts.Node): ts.Node => {
        if (ts.isCallExpression(node)) {
          const typeArgument = node.typeArguments?.[0];

          if (!typeArgument) {
            return ts.visitEachChild(node, visitor, context);
          }

          const signature = typeChecker.getResolvedSignature(node);
          if (signature?.declaration) {
            const sourceName = signature.declaration.getSourceFile().fileName;

            if (!sourceName.includes('ts-schemaof')) {
              return ts.visitEachChild(node, visitor, context);
            }

            const type = typeChecker.getTypeFromTypeNode(typeArgument);
            const symbol = type.aliasSymbol || type.symbol;
            const options = { id: symbol.name, ignoreErrors: true, required: true };

            if (!symbol) {
              throw new Error(`Could not find symbol for passed type`);
            }

            return toLiteral(tjs.generateSchema(program as any, symbol.name, options as any));
          }
        }

        return ts.visitEachChild(node, visitor, context);
      };

      return ts.visitNode(sourceFile, visitor);
    };
  };

  return transformerFactory;
};

function toLiteral(input: unknown): ts.PrimaryExpression {
  switch (typeof input) {
    case 'boolean':
    case 'number':
    case 'string':
      return ts.createLiteral(input);
    case 'object':
      if (Array.isArray(input)) {
        return ts.createArrayLiteral(input.map(toLiteral));
      } else if (input !== null) {
        const obj = input as Record<string, unknown>;
        if (obj.format === 'date-time') {
          obj['coerce'] = 'date';
        }
        return ts.createObjectLiteral(
          Object.keys(obj).map((key) => ts.createPropertyAssignment(ts.createLiteral(key), toLiteral(obj[key])))
        );
      }
    default:
      return ts.createNull();
  }
}
