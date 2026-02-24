# Phase 1: Restructure docs/user-guide

## Context
- Parent: [plan.md](./plan.md)
- Source: `docs/user-guide/` (22 files, 4 subdirs)

## Overview
- **Priority:** High (all other phases depend on correct structure)
- **Status:** complete
- **Description:** Rename all files/dirs with numbered prefixes, update all internal cross-references

## Rename Map

### Top-level files
| Before | After |
|--------|-------|
| `index.md` | `index.md` (unchanged) |
| `introduction.md` | `01-introduction.md` |
| `v-model-and-documents.md` | `02-v-model-and-documents.md` |
| `quick-start.md` | `03-quick-start.md` |

### Directories
| Before | After |
|--------|-------|
| `workflow/` | `04-workflow/` |
| `roles/` | `05-roles/` |
| `team-playbook/` | `06-team-playbook/` |
| `reference/` | `07-reference/` |

### workflow/ → 04-workflow/
| Before | After |
|--------|-------|
| `index.md` | `index.md` (unchanged) |
| `requirements.md` | `01-requirements.md` |
| `design.md` | `02-design.md` |
| `testing.md` | `03-testing.md` |
| `supplementary.md` | `04-supplementary.md` |
| `change-request.md` | `05-change-request.md` |

### roles/ → 05-roles/
| Before | After |
|--------|-------|
| `pm.md` | `01-pm.md` |
| `ba.md` | `02-ba.md` |
| `dev-lead.md` | `03-dev-lead.md` |
| `qa.md` | `04-qa.md` |
| `sales.md` | `05-sales.md` |

### team-playbook/ → 06-team-playbook/
| Before | After |
|--------|-------|
| `index.md` | `index.md` (unchanged) |
| `scenarios.md` | `01-scenarios.md` |
| `checklists.md` | `02-checklists.md` |
| `review-and-approval.md` | `03-review-and-approval.md` |

### reference/ → 07-reference/
| Before | After |
|--------|-------|
| `commands.md` | `01-commands.md` |
| `configuration.md` | `02-configuration.md` |
| `glossary.md` | `03-glossary.md` |

## Link Replacement Map

All `](./` relative links must be updated. Complete mapping:

```
./introduction.md           → ./01-introduction.md
./v-model-and-documents.md  → ./02-v-model-and-documents.md
./quick-start.md            → ./03-quick-start.md
./workflow/index.md         → ./04-workflow/index.md
./workflow/requirements.md  → ./04-workflow/01-requirements.md
./workflow/design.md        → ./04-workflow/02-design.md
./workflow/testing.md       → ./04-workflow/03-testing.md
./workflow/supplementary.md → ./04-workflow/04-supplementary.md
./workflow/change-request.md→ ./04-workflow/05-change-request.md
./roles/pm.md               → ./05-roles/01-pm.md
./roles/ba.md               → ./05-roles/02-ba.md
./roles/dev-lead.md         → ./05-roles/03-dev-lead.md
./roles/qa.md               → ./05-roles/04-qa.md
./roles/sales.md            → ./05-roles/05-sales.md
./roles/                    → ./05-roles/
./team-playbook/index.md    → ./06-team-playbook/index.md
./team-playbook/scenarios.md→ ./06-team-playbook/01-scenarios.md
./team-playbook/checklists.md→./06-team-playbook/02-checklists.md
./team-playbook/review-and-approval.md → ./06-team-playbook/03-review-and-approval.md
./reference/commands.md     → ./07-reference/01-commands.md
./reference/configuration.md→ ./07-reference/02-configuration.md
./reference/glossary.md     → ./07-reference/03-glossary.md
```

**Relative links within subdirs** (e.g., `./index.md`, `./requirements.md` inside workflow/) also need updating — these become `./01-requirements.md`, etc.

**Parent links** (e.g., `../v-model-and-documents.md` from workflow/) → `../02-v-model-and-documents.md`

## Implementation Steps

1. Create new directory structure with `mv` commands (rename dirs first, then files)
2. Update all internal links in every .md file using the replacement map
3. Verify no broken links remain (grep for old names)

## Related Code Files
- `docs/user-guide/**/*.md` — all 22 files

## Todo
- [x] Rename 4 directories
- [x] Rename 18 files (excluding index.md files)
- [x] Update internal links in `index.md` (24 links)
- [x] Update internal links in all workflow/ files (~20 links)
- [x] Update internal links in all team-playbook/ files (~15 links)
- [x] Update internal links in standalone files (introduction, quick-start, v-model)
- [x] Verify: grep old filenames to confirm zero leftover references

## Success Criteria
- All files renamed with numbered prefixes
- Zero broken internal links (grep confirms no old paths remain)
- VitePress sidebar auto-generates in correct order

## Risk
- **Link breakage**: High density of cross-references (60+ links). Must update every occurrence.
- **Mitigation**: Grep verification pass after all renames.
