/**
 * TypeScript AST analysis via ts-morph — extracts classes, functions, endpoints, entities.
 * ts-morph is a listed dependency; dynamic import used for lazy loading.
 */
import { SekkeiError } from "./errors.js";
import { logger } from "./logger.js";

const MAX_FILES = 100;
const PARSE_TIMEOUT_MS = 10_000;

export interface ExtractedClass {
  name: string;
  methods: { name: string; params: string; returnType: string }[];
  properties: { name: string; type: string }[];
  extends?: string;
  implements?: string[];
}

export interface ExtractedFunction {
  name: string;
  params: string;
  returnType: string;
  exported: boolean;
  filePath: string;
}

export interface ExtractedEndpoint {
  method: string;
  path: string;
  handlerName: string;
  filePath: string;
}

export interface ExtractedEntity {
  name: string;
  columns: { name: string; type: string; nullable: boolean }[];
  relations: { name: string; type: string; target: string }[];
}

export interface CodeContext {
  classes: ExtractedClass[];
  functions: ExtractedFunction[];
  apiEndpoints: ExtractedEndpoint[];
  dbEntities: ExtractedEntity[];
  fileCount: number;
  parseErrors: string[];
}

const HTTP_METHODS = ["get", "post", "put", "delete", "patch"] as const;
const RELATION_DECORATORS = ["ManyToOne", "OneToMany", "ManyToMany", "OneToOne"];

export async function analyzeTypeScript(projectPath: string): Promise<CodeContext> {
  let TsMorph: typeof import("ts-morph");
  try {
    TsMorph = await import("ts-morph");
  } catch {
    throw new SekkeiError(
      "CODE_ANALYSIS_FAILED",
      "ts-morph is not available. Install it as a dependency.",
      { projectPath }
    );
  }

  const { Project } = TsMorph;
  const result: CodeContext = {
    classes: [],
    functions: [],
    apiEndpoints: [],
    dbEntities: [],
    fileCount: 0,
    parseErrors: [],
  };

  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Code analysis timed out")), PARSE_TIMEOUT_MS);
  });

  const analysisPromise = (async () => {
    const { existsSync } = await import("node:fs");
    const { join } = await import("node:path");

    if (!existsSync(projectPath)) {
      throw new SekkeiError("CODE_ANALYSIS_FAILED", `Project path does not exist: ${projectPath}`, { projectPath });
    }

    const tsConfigPath = join(projectPath, "tsconfig.json");
    let project: InstanceType<typeof Project>;

    if (existsSync(tsConfigPath)) {
      project = new Project({ tsConfigFilePath: tsConfigPath, skipAddingFilesFromTsConfig: false });
    } else {
      project = new Project({
        compilerOptions: { target: 99, module: 99, strict: true, experimentalDecorators: true },
      });
      project.addSourceFilesAtPaths(`${projectPath}/**/*.ts`);
    }

    let sourceFiles = project.getSourceFiles().filter(
      (f) => !f.getFilePath().includes("node_modules") && !f.getFilePath().includes("/dist/")
    );

    if (sourceFiles.length > MAX_FILES) {
      logger.warn({ total: sourceFiles.length, limit: MAX_FILES }, "File limit reached — truncating");
      sourceFiles = sourceFiles.slice(0, MAX_FILES);
    }

    result.fileCount = sourceFiles.length;

    for (const sourceFile of sourceFiles) {
      const filePath = sourceFile.getFilePath();
      try {
        // Extract classes
        for (const cls of sourceFile.getClasses()) {
          const clsName = cls.getName() ?? "(anonymous)";
          const isEntity = cls.getDecorators().some((d) => d.getName() === "Entity");

          const methods = cls.getMethods().map((m) => ({
            name: m.getName(),
            params: m.getParameters().map((p) => p.getText()).join(", "),
            returnType: m.getReturnType().getText(),
          }));

          const properties = cls.getProperties().map((p) => ({
            name: p.getName(),
            type: p.getType().getText(),
          }));

          const extendsExpr = cls.getExtends();
          const implementsExprs = cls.getImplements();

          result.classes.push({
            name: clsName,
            methods,
            properties,
            extends: extendsExpr?.getText(),
            implements: implementsExprs.length > 0 ? implementsExprs.map((i) => i.getText()) : undefined,
          });

          // Extract TypeORM entities
          if (isEntity) {
            const columns: ExtractedEntity["columns"] = [];
            const relations: ExtractedEntity["relations"] = [];

            for (const prop of cls.getProperties()) {
              const decoratorNames = prop.getDecorators().map((d) => d.getName());
              if (decoratorNames.includes("Column") || decoratorNames.includes("PrimaryGeneratedColumn") || decoratorNames.includes("PrimaryColumn")) {
                const colDecorator = prop.getDecorators().find((d) => d.getName() === "Column");
                let nullable = false;
                if (colDecorator) {
                  const args = colDecorator.getArguments();
                  nullable = args.some((a) => a.getText().includes("nullable: true"));
                }
                columns.push({ name: prop.getName(), type: prop.getType().getText(), nullable });
              }
              const relationDec = decoratorNames.find((n) => RELATION_DECORATORS.includes(n));
              if (relationDec) {
                relations.push({ name: prop.getName(), type: relationDec, target: prop.getType().getText() });
              }
            }

            result.dbEntities.push({ name: clsName, columns, relations });
          }
        }

        // Extract exported functions
        for (const fn of sourceFile.getFunctions()) {
          if (fn.isExported()) {
            result.functions.push({
              name: fn.getName() ?? "(anonymous)",
              params: fn.getParameters().map((p) => p.getText()).join(", "),
              returnType: fn.getReturnType().getText(),
              exported: true,
              filePath,
            });
          }
        }

        // Detect Express/Hono endpoints via call expressions
        sourceFile.forEachDescendant((node) => {
          const { SyntaxKind } = TsMorph;
          if (node.getKind() !== SyntaxKind.CallExpression) return;
          const callExpr = node.asKindOrThrow(SyntaxKind.CallExpression);
          const expr = callExpr.getExpression();
          if (expr.getKind() !== SyntaxKind.PropertyAccessExpression) return;

          const propAccess = expr.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
          const methodName = propAccess.getName();
          if (!(HTTP_METHODS as readonly string[]).includes(methodName)) return;

          const callArgs = callExpr.getArguments();
          if (callArgs.length < 1) return;

          const firstArg = callArgs[0].getText().replace(/['"]/g, "");
          const handlerName = callArgs.length > 1 ? callArgs[1].getText().slice(0, 50) : "(inline)";

          result.apiEndpoints.push({
            method: methodName.toUpperCase(),
            path: firstArg,
            handlerName,
            filePath,
          });
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.parseErrors.push(`${filePath}: ${msg}`);
      }
    }

    project.getSourceFiles().forEach((f) => {
      try { f.forget(); } catch { /* ignore */ }
    });
  })();

  try {
    await Promise.race([analysisPromise, timeoutPromise]);
  } catch (err) {
    if (err instanceof SekkeiError) throw err;
    throw new SekkeiError("CODE_ANALYSIS_FAILED", err instanceof Error ? err.message : String(err), { projectPath });
  } finally {
    clearTimeout(timeoutId!);
  }

  return result;
}
