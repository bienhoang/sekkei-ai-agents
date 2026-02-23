---
name: sekkei
description: "Generate Japanese specification documents (設計書) following V-model chain. Commands: rfp, functions-list, requirements, nfr, project-plan, basic-design, security-design, detail-design, test-plan, ut-spec, it-spec, st-spec, uat-spec, validate, status, export, translate, glossary, update"
---

# Sekkei (設計) Documentation Agent

Generate Japanese software specification documents following the V-model document chain.

## Document Generation Commands

### Requirements Phase
- `/sekkei:requirements @input`   — 要件定義書 (02-requirements/requirements.md)
- `/sekkei:nfr @requirements`     — 非機能要件定義書 (02-requirements/nfr.md)
- `/sekkei:functions-list @input` — 機能一覧 (functions-list.md)
- `/sekkei:project-plan @req`     — プロジェクト計画書 (02-requirements/project-plan.md)

### Design Phase
- `/sekkei:basic-design @input`     — 基本設計書 (03-system/ + 05-features/)
- `/sekkei:security-design @bd`     — セキュリティ設計書 (03-system/security-design.md)
- `/sekkei:detail-design @input`    — 詳細設計書 (05-features/{name}/)

### Test Phase
- `/sekkei:test-plan @req`          — テスト計画書 (08-test/test-plan.md)
- `/sekkei:ut-spec @detail-design`  — 単体テスト仕様書 (08-test/ut-spec.md)
- `/sekkei:it-spec @basic-design`   — 結合テスト仕様書 (08-test/it-spec.md)
- `/sekkei:st-spec @basic-design`   — システムテスト仕様書 (08-test/st-spec.md)
- `/sekkei:uat-spec @requirements`  — 受入テスト仕様書 (08-test/uat-spec.md)

## Utility Commands

- `/sekkei:validate [@doc | --structure]` — Validate content or structure
- `/sekkei:status` — Show document chain progress
- `/sekkei:export @doc --format=xlsx|pdf` — Export document to Excel or PDF
- `/sekkei:translate @doc --lang=en` — Translate document with glossary context
- `/sekkei:glossary [seed|add|list|find|export|finalize]` — Manage project terminology (10-glossary.md)
- `/sekkei:update @doc` — Detect upstream changes and impacted sections

## Document Chain

```
RFP (/sekkei:rfp)
  └─► Requirements (/sekkei:requirements)
        ├─► NFR (/sekkei:nfr)
        ├─► Functions List (/sekkei:functions-list)
        ├─► Project Plan (/sekkei:project-plan)
        └─► Glossary seed (/sekkei:glossary seed)
              └─► Basic Design (/sekkei:basic-design)
                    ├─► Security Design (/sekkei:security-design)
                    └─► Detail Design (/sekkei:detail-design)
                          └─► Test Plan (/sekkei:test-plan)
                                ├─► UT Spec (/sekkei:ut-spec)     ← detail-design
                                ├─► IT Spec (/sekkei:it-spec)     ← basic-design
                                ├─► ST Spec (/sekkei:st-spec)     ← basic-design
                                └─► UAT Spec (/sekkei:uat-spec)   ← requirements
```

Output structure:
```
{output.directory}/
  02-requirements/
    requirements.md        ← /sekkei:requirements
    nfr.md                 ← /sekkei:nfr
    project-plan.md        ← /sekkei:project-plan
  03-system/               ← /sekkei:basic-design (shared)
    security-design.md     ← /sekkei:security-design
  04-functions-list.md     ← /sekkei:functions-list
  05-features/{name}/      ← /sekkei:basic-design, detail-design
    ut-spec.md             ← /sekkei:ut-spec (feature scope)
    it-spec.md             ← /sekkei:it-spec (feature scope)
  06-data/                 ← /sekkei:migration-design
  07-operations/           ← /sekkei:operation-design
  08-test/
    test-plan.md           ← /sekkei:test-plan
    ut-spec.md             ← /sekkei:ut-spec
    it-spec.md             ← /sekkei:it-spec
    st-spec.md             ← /sekkei:st-spec
    uat-spec.md            ← /sekkei:uat-spec
  10-glossary.md           ← /sekkei:glossary
```

## References

- `references/doc-standards.md` — Japanese documentation standards and column headers
- `references/v-model-guide.md` — V-model workflow and chain-of-documents guide
