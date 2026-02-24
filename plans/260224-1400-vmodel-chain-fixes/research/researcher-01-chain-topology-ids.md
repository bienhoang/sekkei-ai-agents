# Chain Topology & ID Extraction Research
Date: 2026-02-24 | Researcher: researcher-01

---

## 1. CHAIN_PAIRS (cross-ref-linker.ts, lines 13–53)

Exported const. 33 `[upstream, downstream]` tuples encoding the full V-model DAG. Key clusters:

| Cluster | Pairs |
|---|---|
| Requirements phase | `requirements→{nfr,functions-list,project-plan}`, `functions-list→project-plan` |
| Design phase | `requirements/functions-list→basic-design`, `requirements/nfr/basic-design→security-design`, `basic-design/functions-list/requirements→detail-design` |
| Test phase | `requirements/nfr/basic-design→test-plan`, `test-plan→{ut/it/st/uat-spec}`, `detail-design→ut-spec`, `basic-design→{it/st-spec}`, `functions-list→st-spec`, `requirements/nfr→uat-spec` |
| Supplementary | `requirements/nfr→operation-design`, `basic-design/requirements/operation-design→migration-design`, `functions-list/basic-design→crud-matrix`, `requirements/basic-design→traceability-matrix`, `functions-list→sitemap` |

Consumers: `cross-ref-linker.ts:271` (analyzeGraph), `cr-propagation.ts:20` (BFS traversal), `doc-staleness.ts:100,136` (staleness checks).

---

## 2. ID_ORIGIN (cross-ref-linker.ts, lines 56–80)

Exported const. Maps ID prefix → doc type(s) that define it. 20 entries:

```
F→functions-list, REQ→requirements, NFR→[nfr,requirements],
SCR→basic-design, TBL→basic-design, API→basic-design,
SEC→security-design, CLS→detail-design, DD→detail-design,
PP→project-plan, TP→test-plan, OP→operation-design,
MIG→migration-design, TS→test-plan, UT→ut-spec,
IT→it-spec, ST→st-spec, UAT→uat-spec,
EV→test-evidence, MTG→meeting-minutes, ADR→decision-record,
IF→interface-spec, PG→sitemap
```

Consumers: `cross-ref-linker.ts:84` (isOriginOf — orphaned/missing ID gating), `cr-backfill.ts:45` (detecting added/removed IDs for CR creation).

---

## 3. UPSTREAM_ID_TYPES (validator.ts, lines 120–143)

Module-private const (not exported). Maps `DocType → string[]` of ID prefixes the doc must reference from upstream. Used exclusively in `validateCrossRefs` (line 202).

Selected entries showing divergence from CHAIN_PAIRS:

| DocType | UPSTREAM_ID_TYPES | Upstreams per CHAIN_PAIRS |
|---|---|---|
| `functions-list` | `["REQ"]` | requirements ✓ |
| `nfr` | `["REQ","NFR"]` | requirements (NFR is self-referential — unusual) |
| `security-design` | `["REQ","NFR","API","SCR","TBL"]` | requirements, nfr, basic-design ✓ |
| `detail-design` | `["SCR","TBL","API"]` | basic-design, functions-list, requirements — only basic-design IDs listed |
| `ut-spec` | `["CLS","DD"]` | test-plan, detail-design — test-plan IDs (TP/TS) absent |
| `it-spec` | `["API","SCR","TBL"]` | test-plan, basic-design ✓ |
| `st-spec` | `["SCR","TBL","F"]` | test-plan, basic-design, functions-list ✓ |
| `uat-spec` | `["REQ","NFR"]` | test-plan, requirements, nfr — test-plan IDs absent |
| `migration-design` | `["TBL","REQ","OP"]` | basic-design, requirements, operation-design ✓ |

---

## 4. extractIds vs extractAllIds

### extractIds (id-extractor.ts, lines 24–38)
- Matches `ID_PATTERN`: known prefixes only (`F|REQ|NFR|SCR|TBL|API|CLS|DD|TS|UT|IT|ST|UAT|SEC|PP|TP|OP|MIG|EV|MTG|ADR|IF|PG`)
- Returns `Map<prefix, string[]>` grouped by type
- Import sites: `validator.ts:7` (used in `validateCrossRefs` at line 208 to bucket upstream IDs by prefix type)
- **Note:** `cr-backfill.ts:19` defines a local `extractIds` shadowing the import — it does NOT import from id-extractor

### extractAllIds (id-extractor.ts, lines 41–47)
- Matches `CUSTOM_ID_PATTERN`: any `[A-Z]{2,5}-\d{1,4}` — wider, catches custom prefixes (SAL-001, ACC-001, etc.)
- Returns flat `Set<string>`
- Import sites: `cross-ref-linker.ts:8,218` (adds custom IDs to "defined" set in buildIdGraph), `tools/generate.ts:28,92` (extracts IDs from generated content for chain tracking)

### Why They Diverge

`extractIds` is for **structured cross-ref validation** — validator.ts needs to know which upstream IDs by type are missing/orphaned. Returning a Map<type, ids[]> is ergonomic for that use.

`extractAllIds` is for **chain-wide coverage** — cross-ref-linker and generate.ts need to catch ALL IDs including project-specific custom prefixes, returning a flat Set for set operations.

The two functions answer different questions and are intentionally different. The divergence is correct design.

---

## 5. Deriving UPSTREAM_ID_TYPES from CHAIN_PAIRS + ID_ORIGIN

**Current problem:** UPSTREAM_ID_TYPES is hand-maintained and drifts from CHAIN_PAIRS. E.g. `ut-spec` is missing `TP/TS` from `test-plan` upstream.

**Derivation algorithm:**

```typescript
function deriveUpstreamIdTypes(
  docType: string,
  chainPairs: [string, string][],
  idOrigin: Record<string, string | string[]>
): string[] {
  // 1. Find all upstream doc types for docType
  const upstreams = chainPairs
    .filter(([, down]) => down === docType)
    .map(([up]) => up);

  // 2. Find all ID prefixes that originate from those upstreams
  const prefixes = new Set<string>();
  for (const [prefix, origin] of Object.entries(idOrigin)) {
    const origins = Array.isArray(origin) ? origin : [origin];
    if (origins.some(o => upstreams.includes(o))) {
      prefixes.add(prefix);
    }
  }
  return [...prefixes].sort();
}
```

**Derived vs current — selected diffs:**

| DocType | Derived | Current | Delta |
|---|---|---|---|
| `ut-spec` | `CLS,DD,TP,TS` | `CLS,DD` | missing `TP,TS` (test-plan) |
| `uat-spec` | `NFR,REQ,TP,TS` | `REQ,NFR` | missing `TP,TS` |
| `detail-design` | `CLS,DD,F,REQ,SCR,TBL,API` | `SCR,TBL,API` | missing `F,REQ,CLS,DD` |
| `nfr` | `REQ` | `REQ,NFR` | NFR is self-ref (not derivable from upstreams) |
| `security-design` | `REQ,NFR,SCR,TBL,API,SEC` | `REQ,NFR,API,SCR,TBL` | missing `SEC` — SEC originates from security-design itself, not upstream |

**Caveat:** Pure derivation over-includes (self-referential prefixes like `NFR` in `nfr`, `SEC` in `security-design`) and under-includes doc-specific overrides. The algorithm should be a **baseline** with an explicit override map for exceptions, not a full replacement.

---

## 6. Import Summary

| Symbol | Defined in | Imported by |
|---|---|---|
| `CHAIN_PAIRS` | cross-ref-linker.ts:13 | cross-ref-linker.ts (self), cr-propagation.ts:5, doc-staleness.ts:8 |
| `ID_ORIGIN` | cross-ref-linker.ts:56 | cross-ref-linker.ts (self), cr-backfill.ts:6 |
| `UPSTREAM_ID_TYPES` | validator.ts:120 | validator.ts only (module-private) |
| `extractIds` | id-extractor.ts:24 | validator.ts:7 |
| `extractAllIds` | id-extractor.ts:41 | cross-ref-linker.ts:8, tools/generate.ts:28 |
| `extractIdsByType` | id-extractor.ts:50 | validator.ts:7 |

---

## Unresolved Questions

1. **NFR self-reference:** `nfr` lists `NFR` in UPSTREAM_ID_TYPES — is this intentional (nfr references its own IDs from requirements doc which also defines NFR-xxx)? The `requirements` template embeds NFR-xxx rows, explaining this, but it's non-obvious.
2. **detail-design under-spec:** UPSTREAM_ID_TYPES only lists `SCR,TBL,API` but CHAIN_PAIRS says `requirements`, `functions-list`, `basic-design` all feed into it. Should `REQ` and `F` be required cross-refs?
3. **test-plan IDs missing in ut-spec/uat-spec:** TP/TS prefixes originate from test-plan which is upstream of ut-spec and uat-spec. Intentional omission (test specs don't cite test-plan IDs?) or a gap?
4. **cr-backfill.ts local `extractIds`:** shadows the exported function without importing it. Intentional or oversight? The local version returns `Set<string>` vs `Map<string, string[]>` — different semantics.
