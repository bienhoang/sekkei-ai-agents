# Progressive Document Generation Pattern

Reusable pattern for generating documents in stages instead of a single monolithic call.
All `/sekkei:*` flows reference this document for consistent progressive behavior.

## When to Use Progressive Mode

Use progressive generation when a document has **3+ content sections**. Benefits:
- User sees output within 5-10s (header stage)
- TaskCreate/TaskUpdate provides visual progress in Claude Code UI
- ID continuity maintained via `existing_content` passing between stages

**Fallback:** If pre-scan finds **<= 2 content sections**, skip progressive mode and generate monolithically (single call, no tasks created).

## Section Boundary Reference

Each doc type has natural section boundaries for splitting:

| Doc Type | Boundary Type | Source | Dynamic? |
|----------|--------------|--------|----------|
| requirements | 4 fixed stages | template | No |
| functions-list | 大分類 groups | upstream requirements | Yes |
| nfr | IPA NFUG categories | template (fixed 6) | No |
| project-plan | WBS/milestones/risk | template (fixed 3) | No |
| architecture-design | Design domains | template (fixed 3) | No |
| basic-design | Design sections | template (fixed 6) | No |
| security-design | Security domains | template (fixed 4) | No |
| detail-design | Module groups | template (fixed 4) | No |
| db-design | TBL-xxx groups | upstream basic-design | Yes |
| report-design | RPT-xxx reports | upstream basic-design | Yes |
| batch-design | BATCH-xxx jobs | upstream functions-list | Yes |
| test-plan | Test levels | template (fixed 3) | No |
| ut-spec | CLS-xxx modules | upstream detail-design | Yes |
| it-spec | API-xxx groups | upstream basic-design | Yes |
| st-spec | E2E + NFR tests | template (fixed 3) | No |
| uat-spec | Business scenarios | template (fixed 3) | No |

## Step 1: Pre-Scan Section Boundaries

For **dynamic** doc types (functions-list, db-design, report-design, batch-design, ut-spec, it-spec):
- Analyze upstream content to identify natural section boundaries
- Count entities (大分類 groups, TBL-xxx, RPT-xxx, BATCH-xxx, CLS-xxx, API-xxx)
- Group entities into batches (size varies by doc type — see each flow's specification)

For **fixed** doc types: skip pre-scan, use hardcoded stage boundaries from each flow's specification.

## Step 2: Fallback Check

If pre-scan finds **<= 2 content sections** (dynamic types only):
- Skip progressive mode entirely
- Generate monolithically (single `generate_document` call)
- Do NOT create TaskCreate entries
- Proceed directly to post-gen validation

Fixed doc types always use progressive (minimum 3 stages by design).

## Step 3: Create Task List

Create tasks **BEFORE** starting generation:

```
TaskCreate: "Generate {doc_type} header sections"        (activeForm: "Generating header sections")
TaskCreate: "Generate {section_name}"                     (one per content section from pre-scan or fixed list)
TaskCreate: "Generate {doc_type} summary sections"        (activeForm: "Generating summary") — if doc type has summary
TaskCreate: "Validate {doc_type}"                         (activeForm: "Validating {doc_type}")
```

## Step 4: Generate Header (Stage 1)

- TaskUpdate: mark header task `in_progress`
- Generate ONLY: YAML frontmatter + 改訂履歴 + 承認欄 + 検印欄 + 配布先 + 用語集 + overview/policy sections
- Use template structure + upstream context
- **Write** to output file (creates file)
- TaskUpdate: mark header task `complete`

## Step 5: Generate Content Sections (Stage 2..N)

For each content section identified in pre-scan (or fixed list):
- TaskUpdate: mark this section's task `in_progress`
- Read existing file content (all prior stages' output)
- Generate ONLY that section's content
- Pass `existing_content` for ID continuity
- **Append** to output file
- TaskUpdate: mark this section's task `complete`

## Step 6: Generate Summary (Stage N+1)

If the doc type has summary/appendix/traceability sections:
- TaskUpdate: mark summary task `in_progress`
- Read full file content
- Generate ONLY summary/集計/appendix/traceability sections
- Pass `existing_content` for cross-reference accuracy
- **Append** to output file
- TaskUpdate: mark summary task `complete`

## Step 7: Validate

- TaskUpdate: mark validate task `in_progress`
- Run `validate_document` + `update_chain_status` (per doc type's existing post-gen flow)
- TaskUpdate: mark validate task `complete`

## ID Continuity Between Stages

Each stage MUST continue IDs from where the previous stage ended:
- Read the `existing_content` to find the last assigned ID
- Start new IDs from `last_id + 1`
- Example: if Stage 2 ends with F-015, Stage 3 starts with F-016

The AI instruction for each content stage should include:
> "Continue ID numbering from existing content. The last ID assigned was {last_id}."

## Per-Stage AI Instruction Template

For each content stage, construct the AI instruction as:

```
Generate ONLY the following section for {doc_type}.
Continue from the existing content below (do NOT regenerate prior sections).
Continue ID numbering sequentially from the last ID in existing content.

Section to generate: {section_description}
Sections to include: {section_list}

Existing content (for context and ID continuity — do NOT repeat):
{existing_content}
```

## Dynamic Pre-Scan Instruction Template

For dynamic doc types, instruct the AI to pre-scan before generation:

```
Analyze the upstream content and identify all {entity_type} (e.g., 大分類 groups, TBL-xxx IDs).
List each {entity_type} with its name/ID.
Group into batches of {batch_size} for staged generation.
```
