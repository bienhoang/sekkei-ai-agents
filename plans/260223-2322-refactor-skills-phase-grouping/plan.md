---
title: "Refactor: Decompose SKILL.md into phase-based reference files"
description: "Extract 30 command workflows from monolithic SKILL.md into 5 phase-grouped reference files"
status: completed
priority: P2
effort: 1-2 hours
branch: main
tags: [refactoring, code-quality, documentation]
created: 2026-02-23
---

# Refactor: SKILL.md Phase-Based Decomposition

## Overview

Decompose the 732-line monolithic `SKILL.md` into a ~120-line routing index + 5 phase-based reference files. Follows the existing pattern used by RFP commands (3 dedicated reference files loaded on demand).

## Analysis Report

See [reports/analysis-report.md](reports/analysis-report.md)

## Target Structure (Post-Refactoring)

```
content/
├── SKILL.md (~120 lines — routing index)
└── references/
    ├── phase-requirements.md   (NEW — 4 commands)
    ├── phase-design.md         (NEW — 3 commands)
    ├── phase-test.md           (NEW — 5 commands)
    ├── phase-supplementary.md  (NEW — 4 commands)
    ├── utilities.md            (NEW — 13 commands)
    ├── rfp-command.md          (unchanged)
    ├── rfp-manager.md          (unchanged)
    ├── rfp-loop.md             (unchanged)
    ├── plan-orchestrator.md    (unchanged)
    ├── doc-standards.md        (unchanged)
    └── v-model-guide.md        (unchanged)
```

## Phases

| Phase | Name | Status | Files |
|-------|------|--------|-------|
| 1 | Extract phase reference files | done | 5 new files |
| 2 | Refactor SKILL.md to routing index | done | 1 modified |
| 3 | Validate completeness | done | — |

## Constraints

- Backward compat: all commands work identically
- Don't touch existing RFP files or other existing references
- Each extracted workflow must be verbatim (no content changes)
