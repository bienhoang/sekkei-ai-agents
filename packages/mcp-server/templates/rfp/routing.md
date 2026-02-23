# RFP Phase → Flow Routing

| Current Phase | Action | Flow |
|---------------|--------|------|
| (no workspace) | Init workspace, ask for RFP | — |
| `RFP_RECEIVED` | Run deep analysis | analyze |
| `ANALYZING` | Generate Q&A for client | questions |
| `QNA_GENERATION` | Ask user: wait or draft? | draft |
| `WAITING_CLIENT` | Check for client answers | draft |
| `DRAFTING` | Draft proposal with assumptions | draft |
| `CLIENT_ANSWERED` | Analyze answers, update reqs | impact |
| `PROPOSAL_UPDATE` | Generate/update proposal | proposal |
| `SCOPE_FREEZE` | Finalize + handoff prompt | freeze |

## Navigation Keywords

| Keyword | From Phase | Target | Notes |
|---------|-----------|--------|-------|
| `SHOW` | Any | — | Display current phase output summary |
| `BACK` | Any (except RFP_RECEIVED) | Previous phase | Uses back action, requires force |
| `SKIP_QNA` | QNA_GENERATION | DRAFTING | Draft with assumptions, skip client Q&A |
| `BUILD_NOW` | WAITING_CLIENT | DRAFTING | Draft without waiting for answers |

## Backward Transition Paths

| From | To | Use Case |
|------|----|----------|
| `CLIENT_ANSWERED` | `ANALYZING` | Client answers reveal scope change, re-analyze |
| `CLIENT_ANSWERED` | `QNA_GENERATION` | Need follow-up questions after answers |
| `PROPOSAL_UPDATE` | `QNA_GENERATION` | Multi-round Q&A, proposal needs more info |

## Engineering Principles (always enforce)

- MVP-first
- Workflow before UI
- Admin tools matter more than user UI
- Identity/auth always underestimated
- CSV export always hides workflow complexity

## Hard Constraints

You MUST:
- Assume RFP is incomplete
- Assume hidden manual operations exist
- Assume admin workflow more complex than described

You MUST NOT:
- Jump to architecture before analysis
- Trust initial requirements fully
- Skip Q&A generation
