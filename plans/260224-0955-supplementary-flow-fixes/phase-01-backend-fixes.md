# Phase 1 — Backend Fixes

**Issues:** S1, S2, S3, S4, S5, IMP-4, IMP-5
**Files:** `resolve-output-path.ts`, `cross-ref-linker.ts`

## 1.1 resolve-output-path.ts

**Path:** `sekkei/packages/mcp-server/src/lib/resolve-output-path.ts`

### S1 — Add sitemap output path
After traceability-matrix line, add:
```ts
if (docType === "sitemap") return "03-system/sitemap.md";
```

### S4 — Fix operation-design path (directory → full path)
Change:
```ts
if (docType === "operation-design") return "07-operations/";
```
To:
```ts
if (docType === "operation-design") return "07-operations/operation-design.md";
```

### S5 — Fix migration-design path (directory → full path)
Change:
```ts
if (docType === "migration-design") return "06-data/";
```
To:
```ts
if (docType === "migration-design") return "06-data/migration-design.md";
```

## 1.2 cross-ref-linker.ts

**Path:** `sekkei/packages/mcp-server/src/lib/cross-ref-linker.ts`

### S2 — Add missing chain pair for operation-design
Add after `["requirements", "operation-design"]`:
```ts
["nfr", "operation-design"],
```

### S3 — Add missing chain pairs for migration-design
Add after `["basic-design", "migration-design"]`:
```ts
["requirements", "migration-design"],
["operation-design", "migration-design"],
```

### IMP-5 — Add chain pairs for matrix and sitemap types
Add in supplementary section:
```ts
["functions-list", "crud-matrix"],
["basic-design", "crud-matrix"],
["requirements", "traceability-matrix"],
["basic-design", "traceability-matrix"],
["functions-list", "sitemap"],
```

### IMP-4 — Add supplementary types to docOrder in buildTraceabilityMatrix
Change docOrder (line ~203):
```ts
const docOrder = [
  "requirements", "nfr", "functions-list", "project-plan",
  "basic-design", "security-design", "detail-design",
  "operation-design", "migration-design",
  "test-plan", "ut-spec", "it-spec", "st-spec", "uat-spec",
  "crud-matrix", "traceability-matrix", "sitemap",
];
```

## Checklist
- [ ] S1: sitemap output path added
- [ ] S4: operation-design full path
- [ ] S5: migration-design full path
- [ ] S2: nfr → operation-design chain pair
- [ ] S3: requirements/operation-design → migration-design pairs
- [ ] IMP-5: matrix/sitemap chain pairs
- [ ] IMP-4: docOrder updated
- [ ] Build passes: `npm run lint` from mcp-server
