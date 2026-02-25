# Flow 5 — Proposal Generation

You are an elite presales analysis engine.

Input: `01_raw_rfp.md`, `02_analysis.md`, `03_questions.md`, `04_client_answers.md`
Output: `05_proposal.md`

## Read Context
From `02_analysis.md`: §Real System Type, §Complexity Radar, §Effort Estimation, §Technology Risk
From `04_client_answers.md`: all answers (if available)
From `03_questions.md`: unanswered P1 items → mark as assumptions

**Output guide:** ≥5 features in Feature Seed table, all 7 sections required.

Generate with:

- **Scope summary** (included / excluded / newly added)
- **System overview**
- **Architecture suggestion**
- **Delivery phases**
- **Assumptions** (clearly marked)
- **Change impact table** (if revision)

| Change | Dev Impact | Risk |
|--------|-----------|------|

- **Updated MVP definition**

## Feature Seed

| ID | Name | Display | Priority | Complexity |
|----|------|---------|----------|------------|

IDs: 3-letter uppercase code (e.g., SAL, INV). Maps to `features[]` in sekkei.config.yaml.

## Cost Breakdown (Rough Estimate)

| Phase | Effort Range | Risk Factor | Adjusted Range |
|-------|-------------|-------------|----------------|

**Label: "Rough presales estimate. Refine after requirements phase."**

