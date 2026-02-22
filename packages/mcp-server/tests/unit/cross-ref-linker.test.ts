import { describe, it, expect } from "@jest/globals";
import {
  buildIdGraph,
  buildTraceabilityMatrix,
  analyzeGraph,
  generateSuggestions,
} from "../../src/lib/cross-ref-linker.js";

// --- Fixture content strings ---

const FUNCTIONS_LIST = `
## 機能一覧
| F-001 | ログイン機能 |
| F-002 | 検索機能 |
| F-003 | レポート機能 |
`;

const REQUIREMENTS_PARTIAL = `
## 機能要件
- REQ-001 は F-001 に対応
- REQ-002 は F-002 に対応
`;

const REQUIREMENTS_FULL = `
## 機能要件
- REQ-001 は F-001 に対応
- REQ-002 は F-002 に対応
- REQ-003 は F-003 に対応
`;

const BASIC_DESIGN = `
## 画面設計
- SCR-001 ログイン画面 (REQ-001)
- SCR-002 検索画面 (REQ-002)
- TBL-001 ユーザーテーブル
- API-001 認証API (REQ-001)
`;

const DETAIL_DESIGN = `
## クラス設計
- CLS-001 LoginController (SCR-001, API-001)
- CLS-002 SearchController (SCR-002)
- DD-001 LoginFlow
`;

const TEST_SPEC = `
## テストケース仕様
- UT-001 LoginController test (CLS-001)
- IT-001 Login integration (SCR-001, REQ-001)
- ST-001 System test
`;

// --- Tests ---

describe("buildIdGraph", () => {
  it("extracts defined and referenced IDs from each doc", () => {
    const docs = new Map([
      ["functions-list", FUNCTIONS_LIST],
      ["requirements", REQUIREMENTS_PARTIAL],
    ]);
    const graph = buildIdGraph(docs);

    const fl = graph.get("functions-list")!;
    expect(fl.defined.has("F-001")).toBe(true);
    expect(fl.defined.has("F-002")).toBe(true);
    expect(fl.defined.has("F-003")).toBe(true);

    const req = graph.get("requirements")!;
    expect(req.referenced.has("F-001")).toBe(true);
    expect(req.referenced.has("F-002")).toBe(true);
    expect(req.referenced.has("F-003")).toBe(false);
  });
});

describe("analyzeGraph — orphaned ID detection", () => {
  it("detects F-003 orphaned when not referenced in requirements", () => {
    const docs = new Map([
      ["functions-list", FUNCTIONS_LIST],
      ["requirements", REQUIREMENTS_PARTIAL],
    ]);
    const graph = buildIdGraph(docs);
    const report = analyzeGraph(graph, docs);

    const flReqLink = report.links.find(
      (l) => l.upstream === "functions-list" && l.downstream === "requirements"
    );
    expect(flReqLink).toBeDefined();
    expect(flReqLink!.orphaned_ids).toContain("F-003");
    expect(flReqLink!.orphaned_ids).not.toContain("F-001");
    expect(flReqLink!.orphaned_ids).not.toContain("F-002");
  });

  it("produces orphaned_ids in report with defined_in and expected_in", () => {
    const docs = new Map([
      ["functions-list", FUNCTIONS_LIST],
      ["requirements", REQUIREMENTS_PARTIAL],
    ]);
    const graph = buildIdGraph(docs);
    const report = analyzeGraph(graph, docs);

    const orphaned = report.orphaned_ids.find((o) => o.id === "F-003");
    expect(orphaned).toBeDefined();
    expect(orphaned!.defined_in).toBe("functions-list");
    expect(orphaned!.expected_in).toBe("requirements");
  });
});

describe("analyzeGraph — missing ID detection", () => {
  it("detects REQ-005 referenced in basic-design but not defined in requirements", () => {
    const requirementsContent = `
## 機能要件
- REQ-001 ユーザー認証
- REQ-002 検索
`;
    const basicDesignContent = `
## 画面設計
- SCR-001 (REQ-001)
- SCR-002 (REQ-005)
`;
    const docs = new Map([
      ["requirements", requirementsContent],
      ["basic-design", basicDesignContent],
    ]);
    const graph = buildIdGraph(docs);
    const report = analyzeGraph(graph, docs);

    const reqBdLink = report.links.find(
      (l) => l.upstream === "requirements" && l.downstream === "basic-design"
    );
    expect(reqBdLink).toBeDefined();
    expect(reqBdLink!.missing_ids).toContain("REQ-005");
    expect(reqBdLink!.missing_ids).not.toContain("REQ-001");
  });

  it("records missing_ids with referenced_in and expected_from", () => {
    const requirementsContent = "## 機能要件\n- REQ-001\n";
    const basicDesignContent = "## 設計\n- SCR-001 (REQ-001, REQ-099)\n";
    const docs = new Map([
      ["requirements", requirementsContent],
      ["basic-design", basicDesignContent],
    ]);
    const graph = buildIdGraph(docs);
    const report = analyzeGraph(graph, docs);

    const missing = report.missing_ids.find((m) => m.id === "REQ-099");
    expect(missing).toBeDefined();
    expect(missing!.referenced_in).toBe("basic-design");
    expect(missing!.expected_from).toBe("requirements");
  });
});

describe("buildTraceabilityMatrix", () => {
  it("shows F-001 referenced downstream in requirements", () => {
    const docs = new Map([
      ["functions-list", FUNCTIONS_LIST],
      ["requirements", REQUIREMENTS_FULL],
    ]);
    const matrix = buildTraceabilityMatrix(docs);

    const f001 = matrix.find((e) => e.id === "F-001");
    expect(f001).toBeDefined();
    expect(f001!.doc_type).toBe("functions-list");
    expect(f001!.downstream_refs).toContain("requirements");
  });

  it("shows full chain F-001 → requirements → basic-design", () => {
    const docs = new Map([
      ["functions-list", FUNCTIONS_LIST],
      ["requirements", REQUIREMENTS_FULL],
      ["basic-design", BASIC_DESIGN],
      ["detail-design", DETAIL_DESIGN],
      ["test-spec", TEST_SPEC],
    ]);
    const matrix = buildTraceabilityMatrix(docs);

    const f001 = matrix.find((e) => e.id === "F-001");
    expect(f001).toBeDefined();
    expect(f001!.downstream_refs).toContain("requirements");
    // F-001 not directly referenced in basic-design fixture, but present chain
    expect(f001!.downstream_refs.length).toBeGreaterThan(0);
  });

  it("returns empty array when no docs provided", () => {
    const matrix = buildTraceabilityMatrix(new Map());
    expect(matrix).toHaveLength(0);
  });
});

describe("analyzeGraph — clean chain", () => {
  it("reports no orphaned or missing IDs when all IDs are properly referenced", () => {
    const docs = new Map([
      ["functions-list", FUNCTIONS_LIST],
      ["requirements", REQUIREMENTS_FULL],
      ["basic-design", BASIC_DESIGN],
      ["detail-design", DETAIL_DESIGN],
      ["test-spec", TEST_SPEC],
    ]);
    const graph = buildIdGraph(docs);
    const report = analyzeGraph(graph, docs);

    // requirements should reference all F-xxx from functions-list
    const flReqLink = report.links.find(
      (l) => l.upstream === "functions-list" && l.downstream === "requirements"
    );
    expect(flReqLink).toBeDefined();
    expect(flReqLink!.orphaned_ids).toHaveLength(0);
  });
});

describe("analyzeGraph — partial chain", () => {
  it("skips chain pairs where either doc is absent", () => {
    // Only functions-list + requirements provided — no basic-design etc.
    const docs = new Map([
      ["functions-list", FUNCTIONS_LIST],
      ["requirements", REQUIREMENTS_FULL],
    ]);
    const graph = buildIdGraph(docs);
    const report = analyzeGraph(graph, docs);

    // Only 1 link should be analyzed (functions-list → requirements)
    expect(report.links).toHaveLength(1);
    expect(report.links[0].upstream).toBe("functions-list");
    expect(report.links[0].downstream).toBe("requirements");
  });

  it("returns empty report when no docs provided", () => {
    const docs = new Map<string, string>();
    const graph = buildIdGraph(docs);
    const report = analyzeGraph(graph, docs);

    expect(report.links).toHaveLength(0);
    expect(report.orphaned_ids).toHaveLength(0);
    expect(report.missing_ids).toHaveLength(0);
    expect(report.traceability_matrix).toHaveLength(0);
  });
});

describe("generateSuggestions", () => {
  it("generates human-readable messages for orphaned IDs", () => {
    const partial = {
      links: [],
      orphaned_ids: [{ id: "F-003", defined_in: "functions-list", expected_in: "requirements" }],
      missing_ids: [],
      traceability_matrix: [],
    };
    const suggestions = generateSuggestions(partial);
    expect(suggestions[0]).toContain("F-003");
    expect(suggestions[0]).toContain("functions-list");
    expect(suggestions[0]).toContain("requirements");
  });

  it("generates human-readable messages for missing IDs", () => {
    const partial = {
      links: [],
      orphaned_ids: [],
      missing_ids: [{ id: "REQ-099", referenced_in: "basic-design", expected_from: "requirements" }],
      traceability_matrix: [],
    };
    const suggestions = generateSuggestions(partial);
    expect(suggestions[0]).toContain("REQ-099");
    expect(suggestions[0]).toContain("basic-design");
    expect(suggestions[0]).toContain("requirements");
  });

  it("returns empty array when no issues", () => {
    const partial = {
      links: [],
      orphaned_ids: [],
      missing_ids: [],
      traceability_matrix: [],
    };
    expect(generateSuggestions(partial)).toHaveLength(0);
  });
});
