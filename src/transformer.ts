import * as ts from 'typescript';
import * as tsj from 'typescript-json-schema';

// let path: string | null = null;
let generator: tsj.JsonSchemaGenerator | null = null;

function getGenerator(program: ts.Program): tsj.JsonSchemaGenerator | null {
  if (generator) {
    return generator;
  }

  generator = tsj.buildGenerator(program, { ignoreErrors: true, noExtraProps: true, required: true });
  return generator;
}

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
          Object.keys(obj).map((key) => ts.createPropertyAssignment(ts.createLiteral(key), toLiteral(obj[key]))),
        );
      }
    default:
      return ts.createNull();
  }
}

export function transformer(program: ts.Program) {
  const typeChecker = program.getTypeChecker();
  const schemaGenerator = getGenerator(program);

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

            if (!symbol) {
              throw new Error(`Could not find symbol for passed type`);
            }

            return toLiteral(schemaGenerator?.getSchemaForSymbol(symbol.name));
          }
        }

        return ts.visitEachChild(node, visitor, context);
      };

      return ts.visitNode(sourceFile, visitor);
    };
  };

  return transformerFactory;
}
