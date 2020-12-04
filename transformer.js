"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const ts = __importStar(require("typescript"));
const tsj = __importStar(require("ts-json-schema-generator"));
exports.default = (program) => {
    const typeChecker = program.getTypeChecker();
    let path = null;
    let generator = null;
    function getGenerator(config) {
        var _a;
        if (config.path === path && generator) {
            return generator;
        }
        path = (_a = config.path) !== null && _a !== void 0 ? _a : null;
        generator = tsj.createGenerator(config);
        return generator;
    }
    const transformerFactory = (context) => {
        return (sourceFile) => {
            const visitor = (node) => {
                var _a;
                if (ts.isCallExpression(node)) {
                    const typeArgument = (_a = node.typeArguments) === null || _a === void 0 ? void 0 : _a[0];
                    if (!typeArgument) {
                        return ts.visitEachChild(node, visitor, context);
                    }
                    const signature = typeChecker.getResolvedSignature(node);
                    if (signature === null || signature === void 0 ? void 0 : signature.declaration) {
                        const sourceName = signature.declaration.getSourceFile().fileName;
                        if (!sourceName.includes('ts-schemaof')) {
                            return ts.visitEachChild(node, visitor, context);
                        }
                        const type = typeChecker.getTypeFromTypeNode(typeArgument);
                        const symbol = type.aliasSymbol || type.symbol;
                        const config = {
                            // @ts-expect-error
                            tsconfig: `${program.getCommonSourceDirectory()}tsconfig.json`,
                            path: node.getSourceFile().fileName,
                            skipTypeCheck: true,
                            expose: 'all',
                        };
                        if (!symbol) {
                            throw new Error(`Could not find symbol for passed type`);
                        }
                        return toLiteral(getGenerator(config).createSchema(symbol.name));
                    }
                }
                return ts.visitEachChild(node, visitor, context);
            };
            return ts.visitNode(sourceFile, visitor);
        };
    };
    return transformerFactory;
};
function toLiteral(input) {
    switch (typeof input) {
        case 'boolean':
        case 'number':
        case 'string':
            return ts.createLiteral(input);
        case 'object':
            if (Array.isArray(input)) {
                return ts.createArrayLiteral(input.map(toLiteral));
            }
            else if (input !== null) {
                const obj = input;
                if (obj.format === 'date-time') {
                    obj['coerce'] = 'date';
                }
                return ts.createObjectLiteral(Object.keys(obj).map((key) => ts.createPropertyAssignment(ts.createLiteral(key), toLiteral(obj[key]))));
            }
        default:
            return ts.createNull();
    }
}
