/**
 * AI generation instructions per document type.
 * Extracted from generate.ts to keep tool handlers lean and allow
 * future phases (keigo, project-type, bilingual) to extend cleanly.
 */
import type { DocType, KeigoLevel, Language } from "../types/documents.js";
import { buildInlineYamlLayoutHint } from "./screen-design-instructions.js";

/** Base AI generation instructions per document type */
export const GENERATION_INSTRUCTIONS: Record<DocType, string> = {
  "functions-list": [
    "Generate a 機能一覧 (Function List) from the provided input.",
    "This document is generated AFTER requirements. Cross-reference REQ-xxx IDs from upstream 要件定義書.",
    "Use 3-tier hierarchy: 大分類 -> 中分類 -> 小機能.",
    "ID format: F-001, F-002... (sequential, NOT prefix-based).",
    "Every F-xxx MUST map to at least one REQ-xxx in the 関連要件ID column.",
    "Processing types: 入力/照会/帳票/バッチ/API/イベント/スケジューラ/Webhook.",
    "Priority: 高/中/低. Fill all 11 columns per row.",
    "Generate at least 10 functions covering the scope described.",
    "For large projects (>30 functions): split the 機能一覧表 into sub-sections by 大分類, each with its own heading (## 機能一覧表 — {大分類名}) and table. Maintain sequential F-xxx numbering across all sub-tables.",
    "Optional extra columns (if specified in config): platform (iOS/Android/Web/Backend/Shared), sprint (iteration number), external_system (external API dependency), migration_status (AS-IS/TO-BE/新規/廃止), feature_flag (feature flag name). Add these columns after 備考 if present in the generation context.",
    "In 集計 section: include counts by 処理分類, and REQ coverage metric showing how many upstream REQ-xxx are referenced.",
  ].join("\n"),

  requirements: [
    "Generate 要件定義書 following template's 10-section structure.",
    "IDs: REQ-001 (functional), NFR-001 (non-functional). This is the FIRST chain doc — do NOT reference F-xxx.",
    "Each major requirement needs acceptance criteria.",
    "NFR: IPA NFUG 6 categories, every NFR-xxx needs numeric 目標値. Prohibited: 高速/十分/適切/高い/良好.",
    "Agile preset: user story format ('As a [role], I want [feature], so that [benefit]'), skip 現状課題 detail and 附録.",
    "Input >200KB: organize by subsystem (大分類), ≥3 REQ-xxx per subsystem.",
    "",
    "VALIDATION TARGETS: ≥3 REQ-xxx total, ≥1 NFR-xxx per IPA category with numeric 目標値, 検証方法 (UT/IT/ST/UAT) in ≥80% REQ rows, 関連RFP項目 traced for each REQ.",
  ].join("\n"),

  "basic-design": [
    "Generate a 基本設計書 (Basic Design Document) from the provided input.",
    "Follow the 10-section structure defined in the template.",
    "Screen list: SCR-001 format with 8 columns. Table prefix: M- (Master), T- (Transaction), L- (Log); 物理名 snake_case.",
    "Table definitions: TBL-001 format with 8 columns.",
    "API list: API-001 format with 8 columns.",
    "Report list: RPT-001 format with 6 columns (Section 6).",
    "Include Mermaid diagram suggestions for system architecture and business flow.",
    "Cross-reference REQ-xxx IDs from 要件定義書 if upstream doc is provided.",
    "",
    "### Conditional Sections (based on project_type)",
    "If project has batch processing → include ジョブスケジュール table in Section 8.",
    "If project has report generation → expand Section 6 帳票設計 with output format specs.",
    "If project has mobile screens → include screen transition diagram with platform annotations.",
    "If no external APIs → Section 8.2 外部システム連携 can be marked N/A with rationale.",
    "",
    "Confidence: Add <!-- confidence: high|medium|low --> after each generated section heading. high=directly stated in input, medium=inferred, low=assumed.",
    "Traceability: In each section referencing upstream IDs, add <!-- trace: REQ-xxx,F-xxx --> comment listing the IDs used.",
    "",
    "### Section 5.3 — Screen Layout (画面レイアウト方針)",
    buildInlineYamlLayoutHint(),
  ].join("\n"),

  "detail-design": [
    "Generate a 詳細設計書 (Detail Design Document) from the provided input.",
    "Follow ALL sections defined in the template (14 sections: 4 structural + 10 numbered).",
    "Module design with call relationships between modules.",
    "Class specifications: クラス仕様 table with 7 columns.",
    "API detail specs: endpoint, req/res schemas, error codes.",
    "Validation rules: バリデーション規則 table with 7 columns.",
    "Error message list: エラーメッセージ一覧 table with 6 columns.",
    "Section 9 セキュリティ実装: security countermeasure implementation details per module.",
    "Section 10 パフォーマンス考慮: performance targets, optimization strategies per module.",
    "Include Mermaid classDiagram with CLS-xxx IDs matching クラス一覧 table entries.",
    "Include Mermaid sequence diagrams for key processing flows.",
    "Cross-reference SCR-xxx, TBL-xxx, API-xxx IDs from 基本設計書.",
  ].join("\n"),

  nfr: [
    "Generate a 非機能要件定義書 (Non-Functional Requirements) from requirements.",
    "The upstream 要件定義書 already defines initial NFR-xxx entries (one per IPA category). Use those same IDs and elaborate each with detailed analysis, metrics, and measurement methods.",
    "Add new sequential NFR-xxx IDs for any additional requirements not covered in upstream.",
    "Follow IPA NFUG 6-category framework exactly:",
    "可用性, 性能・拡張性, 運用・保守性, 移行性, セキュリティ, システム環境・エコロジー.",
    "ID format: NFR-001. Each NFR MUST have a specific numeric 目標値.",
    "Prohibited vague terms: 高速, 十分, 適切, 高い, 良好.",
    "Table: NFR-ID, カテゴリ, 要件名, 目標値, 測定方法, 優先度.",
    "Cross-reference REQ-xxx IDs from upstream requirements.",
    "Generate at least 3 NFR entries per IPA category.",
  ].join("\n"),

  "security-design": [
    "Generate a セキュリティ設計書 (Security Design) from basic-design + requirements + nfr.",
    "9 sections: セキュリティ方針, セキュリティ対策一覧, 認証・認可設計, データ保護, 通信セキュリティ, 脆弱性対策, 監査ログ, インシデント対応, 参考資料.",
    "SEC-001 table: SEC-ID | 対策項目 | 対策内容 | 対象 | 優先度 (高/中/低) | 備考. ≥10 entries, all OWASP Top 10.",
    "Each SEC entry: reference ≥1 upstream ID (REQ-xxx, NFR-xxx, API-xxx, SCR-xxx).",
    "認証: auth method (OAuth2/SAML/JWT), RBAC, MFA strategy, session timeout, lockout policy.",
    "Password: bcrypt (cost≥12) or Argon2id — never MD5/SHA1.",
    "データ保護: PII data flow (input→processing→storage→deletion), AES-256 at rest, retention policy.",
    "通信: TLS 1.3+, cipher suites, HSTS. API: rate limiting, CORS, API key management.",
    "脆弱性: map each to OWASP A01-A10. Cover SQLi, XSS, CSRF, SSRF, path traversal.",
    "監査ログ: timestamp, user ID, action, resource, IP, result. Retention: exact days. Tamper-proof.",
    "インシデント: S1 (critical,1h) / S2 (high,4h) / S3 (medium,24h) / S4 (low,72h). Escalation chain.",
    "Cross-reference REQ-xxx, NFR-xxx, API-xxx, SCR-xxx, TBL-xxx IDs from upstream.",
  ].join("\n"),

  "project-plan": [
    "Generate a プロジェクト計画書 (Project Plan) from requirements.",
    "7 sections: プロジェクト概要, WBS・スケジュール, 体制, リソース計画, リスク管理, 品質管理, コミュニケーション計画.",
    "ID format: PP-001. WBS table with phases, tasks, assignees, dates, effort.",
    "Risk management: risk ID, probability, impact, mitigation strategy.",
    "Milestone table with dates and deliverables.",
    "Cross-reference REQ-xxx IDs from upstream 要件定義書. Include F-xxx from 機能一覧 if available.",
  ].join("\n"),

  "test-plan": [
    "Generate a テスト計画書 (Test Plan) from requirements + basic-design.",
    "7 sections: テスト方針, テスト戦略, テスト環境, テストスケジュール, 体制・役割, リスクと対策, 完了基準.",
    "ID format: TP-001. Define entry/exit criteria per test level (UT/IT/ST/UAT).",
    "Test strategy: scope, test levels, test types, risk-based priority.",
    "Environment table: environment name, purpose, configuration, notes.",
    "Cross-reference REQ-xxx, F-xxx, NFR-xxx IDs from upstream.",
  ].join("\n"),

  "ut-spec": [
    "Generate a 単体テスト仕様書 (Unit Test Specification) from detail-design.",
    "Sections: テスト設計, 単体テストケース, トレーサビリティ, デフェクト報告.",
    "Test case 12-column table: No., テストケースID, テスト対象, テスト観点, 前提条件, テスト手順, 入力値, 期待値, 実行結果, 判定, デフェクトID, 備考.",
    "ID format: UT-001. テスト観点: 正常系/異常系/境界値.",
    "Cross-reference CLS-xxx, DD-xxx IDs from detail-design.",
    "Traceability: DD-xxx → CLS-xxx → UT-xxx.",
    "Generate at least 5 cases per major module.",
  ].join("\n"),

  "it-spec": [
    "Generate a 結合テスト仕様書 (Integration Test Specification) from basic-design.",
    "Sections: テスト設計, 結合テストケース, トレーサビリティ, デフェクト報告.",
    "Same 12-column table structure as ut-spec.",
    "ID format: IT-001. Focus on API integration, screen transitions, data flow.",
    "Cross-reference API-xxx, SCR-xxx, TBL-xxx IDs from basic-design.",
    "Traceability: API-xxx → SCR-xxx → IT-xxx.",
    "Generate at least 5 integration test cases.",
  ].join("\n"),

  "st-spec": [
    "Generate a システムテスト仕様書 (System Test Specification) from basic-design + functions-list.",
    "Sections: テスト設計, システムテストケース, トレーサビリティ, デフェクト報告.",
    "Same 12-column table structure. No feature scope (system-level).",
    "ID format: ST-001. テスト観点: パフォーマンス/セキュリティ/負荷/E2E.",
    "Cross-reference SCR-xxx, TBL-xxx, F-xxx IDs from basic-design + functions-list.",
    "Traceability: F-xxx → SCR-xxx → ST-xxx.",
    "Include E2E business scenario tests.",
  ].join("\n"),

  "uat-spec": [
    "Generate a 受入テスト仕様書 (User Acceptance Test Specification) from requirements + nfr.",
    "Sections: テスト設計, 受入テストケース, トレーサビリティ, デフェクト報告.",
    "Same 12-column table structure. No feature scope (business-level).",
    "ID format: UAT-001. Business scenario-based, user-facing language.",
    "Cross-reference REQ-xxx, NFR-xxx IDs from requirements + nfr.",
    "Traceability: REQ-xxx → NFR-xxx → UAT-xxx.",
    "Include acceptance criteria verification for each major requirement.",
  ].join("\n"),

  "crud-matrix": [
    "Generate a CRUD matrix (CRUD図) in markdown table format.",
    "Rows = functions (F-xxx from 機能一覧). Columns = tables (TBL-xxx from テーブル定義).",
    "Cell values: C (Create), R (Read), U (Update), D (Delete), CR, CRU, CRUD, or blank.",
    "Format: | 機能ID | 機能名 | TBL-001 テーブル名 | TBL-002 テーブル名 | ...",
    "Every function must have at least one CRUD operation. Every table must be referenced by at least one function.",
    "Include a summary row at the bottom with total C/R/U/D counts per table.",
  ].join("\n"),

  "traceability-matrix": [
    "Generate a traceability matrix (トレーサビリティマトリックス) in markdown table format.",
    "Rows = requirements (REQ-xxx). Columns = SCR-xxx, API-xxx, UT-xxx, IT-xxx, ST-xxx.",
    "Cell value: ○ if covered, blank if not.",
    "Format: | REQ-ID | 要件名 | SCR-xxx | API-xxx | UT-xxx | IT-xxx | ST-xxx |",
    "Every REQ must be covered by at least one SCR, API, or test case.",
    "Include a coverage summary row at the bottom: covered/total per column.",
  ].join("\n"),

  "operation-design": [
    "Generate a 運用設計書 (Operation Design Document) from the provided input.",
    "Include all 6 sections: 運用体制, バックアップ・リストア方針, 監視・アラート定義, 障害対応手順, ジョブ管理, SLA定義.",
    "障害対応手順: Use OP-001 format with 6 columns: OP-ID, 手順名, 障害レベル (重大/警告/軽微), 手順内容, 担当者, 想定時間.",
    "Runbook structure: each OP entry is a self-contained runbook step (check → action → verify).",
    "Alert threshold guidance: define both 警告 (warning) and 異常 (critical) thresholds per metric.",
    "On-call escalation format: L1 → L2 → L3 escalation path with contact and SLA per level.",
    "バックアップ・リストア方針: every data store MUST have RPO and RTO values. Reference TBL-xxx.",
    "Restore procedure: include step-by-step restore test schedule (monthly recommended).",
    "監視・アラート定義: numeric thresholds required. Reference API-xxx as monitoring targets.",
    "SLA定義: every item MUST have numeric target. Prohibited: 高い, 十分, 適切, 良好, 高速.",
    "SLA breach response: define what happens when SLA is breached (incident, compensation).",
    "ジョブ管理: list batch jobs with cron schedule, dependencies, retry policy, failure alert.",
    "Reference F-xxx from functions-list for batch jobs if available.",
    "Cross-reference NFR-xxx, REQ-xxx, API-xxx, TBL-xxx IDs from upstream documents.",
  ].join("\n"),

  "migration-design": [
    "Generate a 移行設計書 (Migration Design Document) from the provided input.",
    "Include all 5 sections: 移行方針, データ移行計画, システム切替手順, ロールバック計画, 移行テスト計画.",
    "ID format: MIG-001. Columns: MIG-ID, 対象データ, 移行方法, 検証方法, 担当者, データ量, 想定時間.",
    "移行方針: state the approach (big bang / phased / parallel run) with rationale.",
    "データ移行計画: include data volume estimates (row counts or GB). Reference TBL-xxx IDs.",
    "システム切替手順: step-by-step cutover procedure with estimated time per step and owner.",
    "Zero-downtime strategy: if required, describe blue-green or canary approach.",
    "ロールバック計画: define rollback trigger criteria, step-by-step rollback with time window.",
    "Rollback decision point: state latest go/no-go decision time before point-of-no-return.",
    "移行テスト計画: data integrity checks, count reconciliation, spot-check sampling strategy.",
    "Cross-reference TBL-xxx, REQ-xxx, and OP-xxx IDs from upstream documents.",
    "Data cutover sequence: list tables in dependency order (FK constraints).",
    "Risk: identify top 3 migration risks with mitigation steps.",
  ].join("\n"),

  "sitemap": [
    "Generate a サイトマップ (Sitemap / System Structure Map) from the provided input.",
    "Show the functional structure and page/screen hierarchy of the target system.",
    "Output TWO sections:",
    "",
    "### Section 1: サイトマップツリー (Tree Structure)",
    "Use indented markdown list to show parent-child hierarchy.",
    "Hierarchy depth rules: max 3 levels recommended (top → category → page). Flatten if deeper.",
    "URL convention: use kebab-case for URL paths (e.g., /user-management/list).",
    "Access control annotation: mark pages requiring authentication with [要認証] or role (e.g., [管理者]).",
    "Example format:",
    "- トップページ (TOP) [公開]",
    "  - ユーザー管理 (F-001) [要認証]",
    "    - ユーザー一覧 /users",
    "    - ユーザー登録 /users/new",
    "",
    "### Section 2: ページ一覧 (Page/Screen List Table)",
    "Columns: | ページID | ページ名 | URL/ルート | 親ページ | 関連機能 (F-xxx) | アクセス権限 | 処理概要 |",
    "Every page/screen must have a unique ID (PG-001 format).",
    "Map F-xxx IDs from 機能一覧 to relevant pages where applicable.",
    "Include all user-facing pages AND admin/management pages.",
    "For web: URL paths. For mobile: screen names. For API: endpoint groups. For batch: job categories.",
  ].join("\n"),

  "test-evidence": [
    "Generate a テストエビデンス (Test Evidence) collection template from the provided test specification.",
    "Cross-reference UT/IT/ST/UAT test case IDs from the upstream test-spec document.",
    "Generate one evidence row per test case using EV-001 format.",
    "Required sections per test level (UT/IT/ST/UAT):",
    "| エビデンスID | テストケースID | テスト項目 | 期待結果 | 実施結果 | スクリーンショット | 合否 | テスター | 実施日 |",
    "Include a summary section with pass/fail counts per test level.",
    "Every test case ID from upstream MUST have a corresponding evidence entry.",
  ].join("\n"),

  "meeting-minutes": [
    "Generate a 議事録 (Meeting Minutes) from the provided meeting notes.",
    "Structure the raw notes into formal meeting record format.",
    "Use MTG-001 format for meeting ID.",
    "Required sections:",
    "1. 会議情報 — date, time, location, purpose",
    "2. 出席者 — attendees table with role and organization",
    "3. 議題 — numbered agenda items",
    "4. 決定事項 — decisions table with columns: 決定ID, 決定内容, 関連ドキュメントID, 決定者",
    "5. アクション項目 — who/what/when format: 担当者, 作業内容, 期限, ステータス (未着手/進行中/完了)",
    "Decision log: separate decisions (合意した事項) from discussion points (議論した事項) clearly.",
    "Action item format: each item must have single owner (not 'team'), specific deadline (date not 'soon').",
    "Decisions MUST reference affected doc IDs (REQ-xxx, SCR-xxx, F-xxx) if applicable.",
    "Discussion points that need follow-up: capture as action items, not decisions.",
    "Next meeting: include date/time/agenda for next meeting if discussed.",
    "Prohibited: vague action items without owner or deadline.",
  ].join("\n"),

  "decision-record": [
    "Generate a 設計判断記録 (Architecture Decision Record / ADR) from the provided discussion notes.",
    "Use ADR-001 format for decision record ID. Follow ADR format: context/decision/consequences.",
    "Required sections:",
    "1. コンテキスト — background, problem statement, constraints driving the decision",
    "2. 検討事項 — options table: | 選択肢 | メリット | デメリット | 判定 (採用/却下) |",
    "3. 決定内容 — selected option with rationale (WHY this option over alternatives)",
    "4. 影響範囲 — positive consequences, negative consequences, affected document IDs",
    "5. ステータス — lifecycle: 提案中 → 承認済み → 廃止済み. Include date of each transition.",
    "6. 参加者 — participants list with roles and organization",
    "At least 2 options MUST be listed in 検討事項 (rejected options document explored alternatives).",
    "Decision MUST reference affected doc IDs (REQ-xxx, NFR-xxx, F-xxx, API-xxx).",
    "Consequences: be explicit about trade-offs accepted (e.g., 'we accept higher cost for lower latency').",
    "Status lifecycle: an ADR can be superseded — reference the superseding ADR-xxx if applicable.",
    "One decision per ADR — split compound decisions into separate ADR records.",
  ].join("\n"),

  "interface-spec": [
    "Generate a IF仕様書 (Interface Specification) from the provided input.",
    "Use IF-001 format for interface specification ID.",
    "Required sections:",
    "1. インターフェース概要 — name, owner (provider), consumer, purpose, version",
    "2. データフォーマット — request/response schema tables with field name, type, required, description",
    "3. プロトコル — communication protocol (REST/gRPC/MQ), authentication, encoding (UTF-8/etc.)",
    "4. エラーハンドリング — error code table: | エラーコード | HTTP status | メッセージ | 原因 | 対処 |",
    "5. SLA定義 — availability %, latency p95/p99, throughput (req/s), timeout values",
    "6. 承認 — approval chain signed by both provider and consumer parties",
    "API contract versioning: specify version (v1, v2), deprecation policy, backward compat strategy.",
    "Error code table: define all error codes from E-001 (or HTTP 4xx/5xx) with retry guidance.",
    "Breaking change policy: how version bumps are communicated and migration path.",
    "Each interface MUST define both sides' responsibilities (provider SLA, consumer obligations).",
    "Idempotency: state if operations are idempotent and which retry strategies are safe.",
    "Cross-reference API-xxx IDs from basic-design if upstream doc is provided.",
  ].join("\n"),

  "screen-design": [
    "Generate a 画面設計書 (Screen Design Document) from the provided input.",
    "Required sections:",
    "1. 画面一覧 — screen list table with SCR-xxx IDs",
    "2. 画面遷移図 — Mermaid stateDiagram-v2 for screen transitions",
    "3. コンポーネントカタログ — reusable UI component definitions",
    "4. 画面詳細 — per-screen spec with 6 sub-sections:",
    "   a. 画面レイアウト — structured YAML layout block (see format below)",
    "   b. 画面項目定義 — item definition table with # ①②③ matching YAML `n` values",
    "   c. バリデーション一覧 — validation rules per field",
    "   d. イベント一覧 — trigger/action mapping",
    "   e. 画面遷移 — per-screen transitions",
    "   f. 権限 — role-based access matrix",
    "5. API連携 — screen event ↔ API-xxx mapping table",
    "",
    "### Screen Layout Format (section 4.a)",
    buildInlineYamlLayoutHint(),
    "",
    "Cross-reference SCR-xxx and API-xxx IDs from basic-design if upstream doc is provided.",
    "Include Mermaid state diagrams for screen transition flows.",
  ].join("\n"),
};

/** Default keigo level per document type */
export const KEIGO_MAP: Record<DocType, KeigoLevel> = {
  "functions-list": "丁寧語",
  requirements: "丁寧語",
  nfr: "丁寧語",
  "project-plan": "丁寧語",
  "basic-design": "丁寧語",
  "security-design": "simple",
  "detail-design": "simple",
  "test-plan": "simple",
  "ut-spec": "simple",
  "it-spec": "simple",
  "st-spec": "simple",
  "uat-spec": "simple",
  "crud-matrix": "simple",
  "traceability-matrix": "simple",
  "operation-design": "simple",
  "migration-design": "simple",
  "sitemap": "simple",
  "test-evidence": "simple",
  "meeting-minutes": "丁寧語",
  "decision-record": "simple",
  "interface-spec": "丁寧語",
  "screen-design": "simple",
};

/** Concrete before/after examples per keigo level — keys match KeigoLevel type */
const KEIGO_EXAMPLES: Record<KeigoLevel, [string, string][]> = {
  "丁寧語": [
    ["システムがデータを処理する", "システムがデータを処理します"],
    ["エラーが発生した場合、ログを確認する", "エラーが発生した場合、ログを確認してください"],
    ["設計方針は以下の通りだ", "設計方針は以下の通りです"],
  ],
  "謙譲語": [
    ["システムがデータを処理する", "システムがデータを処理いたします"],
    ["ご確認ください", "ご確認いただけますようお願いいたします"],
    ["報告する", "ご報告申し上げます"],
  ],
  "simple": [
    ["システムがデータを処理します", "システムがデータを処理する"],
    ["確認が必要です", "確認が必要である"],
    ["問題がある場合は対応します", "問題がある場合は対応するものとする"],
  ],
};

/** Build keigo style instruction for AI generation context */
export function buildKeigoInstruction(level: KeigoLevel): string {
  let baseInstruction: string;
  switch (level) {
    case "丁寧語":
      baseInstruction = [
        "## Writing Style (敬語)",
        "Use ですます調 throughout. Every sentence must end with です or ます.",
        "Never use だ or である for sentence endings.",
      ].join("\n");
      break;
    case "謙譲語":
      baseInstruction = [
        "## Writing Style (敬語)",
        "Use 謙譲語 keigo throughout. Be appropriately humble.",
        "Maintain consistent formal register across all sections.",
      ].join("\n");
      break;
    case "simple":
      baseInstruction = [
        "## Writing Style (敬語)",
        "Use である調 throughout. Sentences end with である, する, した, etc.",
        "Never use です or ます for sentence endings.",
      ].join("\n");
      break;
  }
  const examples = KEIGO_EXAMPLES[level] ?? KEIGO_EXAMPLES["丁寧語"];
  const exBlock = examples.map(([bad, good]) => `  ✗ 「${bad}」\n  ✓ 「${good}」`).join("\n");
  return `${baseInstruction}\n例:\n${exBlock}`;
}

/** Language display names for bilingual and output language instruction blocks */
const LANG_DISPLAY_NAMES: Record<string, string> = {
  en: "English",
  vi: "Vietnamese (Tiếng Việt)",
};

/**
 * Build output language instruction block.
 * Always injected to ensure explicit output language directive.
 */
export function buildOutputLanguageInstruction(lang: Language): string {
  if (lang === "ja") {
    return [
      `## Output Language`,
      ``,
      `Write ALL output content in **Japanese (日本語)**. You MUST:`,
      `1. Follow the document structure and section order defined in the template`,
      `2. Write all headings, table headers, body text in formal Japanese`,
      `3. Keep technical identifiers as-is (e.g., REQ-001, SCR-001, F-001)`,
      `4. Write exclusively in Japanese — do not mix in English or other languages except for technical terms`,
    ].join("\n");
  }
  const langName = LANG_DISPLAY_NAMES[lang] ?? lang;
  return [
    `## Output Language`,
    ``,
    `Write ALL output content in **${langName}**. You MUST:`,
    `1. Follow the document structure and section order defined in the Japanese template exactly`,
    `2. Write all headings, table headers, body text, and comments in ${langName}`,
    `3. Translate Japanese section headings (e.g., 概要 → Overview, 画面設計 → Screen Design)`,
    `4. Keep technical identifiers as-is (e.g., REQ-001, SCR-001, F-001, TBL-001)`,
    `5. Keep cross-reference IDs, status values, and format codes unchanged`,
    `6. Do NOT output any Japanese text in the final document`,
  ].join("\n");
}

/**
 * Build bilingual translation instruction block for non-Japanese input.
 * Injected into generation context when input_lang != "ja".
 */
export function buildBilingualInstructions(inputLang: string, glossaryTerms: string): string {
  const langName = LANG_DISPLAY_NAMES[inputLang] ?? inputLang;
  const lines = [
    `## Input Language Instructions`,
    ``,
    `The input content is written in **${langName}**. You MUST:`,
    `1. Fully understand the input in ${langName}`,
    `2. Use the glossary terms below for consistent translation of domain terminology`,
    `3. Extract all requirements, features, and constraints from the ${langName} input`,
    `4. The output language is governed by the ## Output Language section above (or Japanese by default)`,
  ];
  if (glossaryTerms) {
    lines.push(``, `### Domain Glossary`, ``, glossaryTerms);
  }
  return lines.join("\n");
}

/** Format glossary result from Python bridge into context-friendly markdown */
export function formatGlossaryForContext(result: Record<string, unknown>): string {
  const terms = result.terms as Array<{ ja: string; en?: string; vi?: string; context?: string }> | undefined;
  if (!terms || terms.length === 0) return "";
  const rows = terms.slice(0, 50).map(
    (t) => `| ${t.ja} | ${t.en ?? ""} | ${t.vi ?? ""} | ${t.context ?? ""} |`
  );
  return [
    `| Japanese | English | Vietnamese | Context |`,
    `|---------|---------|------------|---------|`,
    ...rows,
  ].join("\n");
}

/** Build AI confidence annotation instruction block */
export function buildConfidenceInstruction(): string {
  return [
    "## Confidence Annotations",
    "For each section, add an HTML comment indicating confidence level:",
    "<!-- confidence: 高 | source: {ID} --> — directly stated in input",
    "<!-- confidence: 中 | source: {ID or context} --> — reasonably inferred from context",
    "<!-- confidence: 低 | source: assumed --> — extrapolated or assumed",
    "At the end of the document, add a confidence summary table:",
    "| 信頼度 | セクション数 | 割合 |",
    "|--------|-------------|------|",
  ].join("\n");
}

/** Build source traceability instruction block */
export function buildTraceabilityInstruction(): string {
  return [
    "## Source Traceability",
    "For each paragraph or requirement statement, add an HTML comment tracing to its source:",
    "<!-- source: REQ-003 --> — traces to upstream document ID",
    "<!-- source: input:section:N --> — traces to input content section N",
    "Every requirement statement MUST trace to an input source.",
    "No section should lack source attribution.",
  ].join("\n");
}

/** Build learning annotation instruction block */
export function buildLearningInstruction(): string {
  return [
    "## Learning Annotations",
    "Add educational HTML comments explaining WHY each section exists:",
    "<!-- learn: この承認欄はISO 9001品質管理要件に基づく -->",
    "<!-- learn: 改訂履歴はJIS X 0160:2021で必須とされる -->",
    "Reference ISO standards, IPA guidelines, or SIer conventions where applicable.",
    "These annotations help new engineers understand document structure rationale.",
  ].join("\n");
}

/** Build changelog preservation instruction for regeneration context */
export function buildChangelogPreservationInstruction(existingRevisionHistory: string): string {
  return [
    "## Changelog Preservation (MANDATORY)",
    "",
    "This document is being REGENERATED. You MUST preserve the existing revision history.",
    "",
    "### Existing 改訂履歴 (copy EXACTLY as-is):",
    "",
    existingRevisionHistory,
    "",
    "### Rules:",
    "1. Copy ALL existing rows into the 改訂履歴 table WITHOUT modification",
    "2. Append ONE new row: next version number | today's date | brief change summary | (empty 変更者)",
    "3. Version increment: +0.1 for minor changes (e.g., 1.0 → 1.1)",
    "4. Do NOT reorder, edit, or remove existing rows",
  ].join("\n");
}

// Re-export screen design instructions (extracted for file size management)
export { buildScreenDesignInstruction, buildInlineYamlLayoutHint } from "./screen-design-instructions.js";
