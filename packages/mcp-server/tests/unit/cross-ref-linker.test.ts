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

const UT_SPEC = `
## 単体テストケース
- UT-001 LoginController test (CLS-001)
- UT-002 SearchController test (CLS-002)
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
  it("detects REQ-003 orphaned when not referenced in basic-design", () => {
    const docs = new Map([
      ["requirements", REQUIREMENTS_FULL],
      ["basic-design", BASIC_DESIGN],
    ]);
    const graph = buildIdGraph(docs);
    const report = analyzeGraph(graph, docs);

    const reqBdLink = report.links.find(
      (l) => l.upstream === "requirements" && l.downstream === "basic-design"
    );
    expect(reqBdLink).toBeDefined();
    expect(reqBdLink!.orphaned_ids).toContain("REQ-003");
    expect(reqBdLink!.orphaned_ids).not.toContain("REQ-001");
    expect(reqBdLink!.orphaned_ids).not.toContain("REQ-002");
  });

  it("produces orphaned_ids in report with defined_in and expected_in", () => {
    const docs = new Map([
      ["requirements", REQUIREMENTS_FULL],
      ["basic-design", BASIC_DESIGN],
    ]);
    const graph = buildIdGraph(docs);
    const report = analyzeGraph(graph, docs);

    const orphaned = report.orphaned_ids.find((o) => o.id === "REQ-003");
    expect(orphaned).toBeDefined();
    expect(orphaned!.defined_in).toBe("requirements");
    expect(orphaned!.expected_in).toBe("basic-design");
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
  it("shows REQ-001 referenced downstream in basic-design", () => {
    const docs = new Map([
      ["requirements", REQUIREMENTS_FULL],
      ["basic-design", BASIC_DESIGN],
    ]);
    const matrix = buildTraceabilityMatrix(docs);

    const req001 = matrix.find((e) => e.id === "REQ-001");
    expect(req001).toBeDefined();
    expect(req001!.doc_type).toBe("requirements");
    expect(req001!.downstream_refs).toContain("basic-design");
  });

  it("shows full chain requirements → basic-design → detail-design → ut-spec", () => {
    const docs = new Map([
      ["requirements", REQUIREMENTS_FULL],
      ["basic-design", BASIC_DESIGN],
      ["detail-design", DETAIL_DESIGN],
      ["ut-spec", UT_SPEC],
    ]);
    const matrix = buildTraceabilityMatrix(docs);

    const req001 = matrix.find((e) => e.id === "REQ-001");
    expect(req001).toBeDefined();
    expect(req001!.downstream_refs).toContain("basic-design");
    expect(req001!.downstream_refs.length).toBeGreaterThan(0);
  });

  it("returns empty array when no docs provided", () => {
    const matrix = buildTraceabilityMatrix(new Map());
    expect(matrix).toHaveLength(0);
  });
});

describe("analyzeGraph — clean chain", () => {
  it("reports no orphaned or missing IDs when all IDs are properly referenced", () => {
    const docs = new Map([
      ["requirements", REQUIREMENTS_PARTIAL],
      ["basic-design", BASIC_DESIGN],
    ]);
    const graph = buildIdGraph(docs);
    const report = analyzeGraph(graph, docs);

    // requirements → basic-design: REQ-001, REQ-002 both referenced in basic-design
    const reqBdLink = report.links.find(
      (l) => l.upstream === "requirements" && l.downstream === "basic-design"
    );
    expect(reqBdLink).toBeDefined();
    expect(reqBdLink!.orphaned_ids).toHaveLength(0);
  });
});

describe("analyzeGraph — functions-list → basic-design chain pair", () => {
  it("detects orphaned F-xxx IDs not referenced in basic-design", () => {
    const docs = new Map([
      ["functions-list", FUNCTIONS_LIST],
      ["basic-design", BASIC_DESIGN],
    ]);
    const graph = buildIdGraph(docs);
    const report = analyzeGraph(graph, docs);

    const flBdLink = report.links.find(
      (l) => l.upstream === "functions-list" && l.downstream === "basic-design"
    );
    expect(flBdLink).toBeDefined();
    // F-003 is defined in functions-list but not referenced in basic-design
    expect(flBdLink!.orphaned_ids).toContain("F-003");
    // F-001 and F-002 are not in basic-design either (basic-design uses REQ-xxx, SCR-xxx, etc.)
    expect(flBdLink!.orphaned_ids).toContain("F-001");
    expect(flBdLink!.orphaned_ids).toContain("F-002");
  });

  it("reports no orphaned F-xxx when all are referenced in basic-design", () => {
    const bdWithFIds = `
## 画面設計
- SCR-001 ログイン画面 (REQ-001, F-001)
- SCR-002 検索画面 (REQ-002, F-002)
- SCR-003 レポート画面 (F-003)
- TBL-001 ユーザーテーブル
- API-001 認証API
`;
    const docs = new Map([
      ["functions-list", FUNCTIONS_LIST],
      ["basic-design", bdWithFIds],
    ]);
    const graph = buildIdGraph(docs);
    const report = analyzeGraph(graph, docs);

    const flBdLink = report.links.find(
      (l) => l.upstream === "functions-list" && l.downstream === "basic-design"
    );
    expect(flBdLink).toBeDefined();
    expect(flBdLink!.orphaned_ids).toHaveLength(0);
  });
});

describe("analyzeGraph — partial chain", () => {
  it("skips chain pairs where either doc is absent", () => {
    // Only requirements + functions-list provided — no basic-design etc.
    const docs = new Map([
      ["requirements", REQUIREMENTS_FULL],
      ["functions-list", FUNCTIONS_LIST],
    ]);
    const graph = buildIdGraph(docs);
    const report = analyzeGraph(graph, docs);

    // Only 1 link should be analyzed (requirements → functions-list)
    expect(report.links).toHaveLength(1);
    expect(report.links[0].upstream).toBe("requirements");
    expect(report.links[0].downstream).toBe("functions-list");
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

describe("NFR origin from requirements", () => {
  it("does not flag NFR-xxx in requirements as orphaned in nfr link", () => {
    const docs = new Map([
      ["requirements", "## 非機能要件\n- NFR-001 可用性\n- NFR-002 性能\n- REQ-001 ログイン"],
      ["nfr", "## 詳細\n- NFR-001 99.9% uptime\n- NFR-002 性能 response <200ms\n"],
    ]);
    const graph = buildIdGraph(docs);
    const report = analyzeGraph(graph, docs);
    // NFR IDs originate from both nfr and requirements — should not be orphaned
    const orphanedNfr = report.orphaned_ids.filter(o => o.id.startsWith("NFR-"));
    expect(orphanedNfr).toHaveLength(0);
  });

  it("includes NFR-xxx from requirements in traceability matrix", () => {
    const docs = new Map([
      ["requirements", "## 非機能要件\n- NFR-001 可用性\n- REQ-001 ログイン"],
      ["basic-design", "## 設計\nNFR-001 based design\n"],
    ]);
    const matrix = buildTraceabilityMatrix(docs);
    const nfrEntry = matrix.find(e => e.id === "NFR-001");
    expect(nfrEntry).toBeDefined();
    expect(nfrEntry!.doc_type).toBe("requirements");
  });
});

describe("generateSuggestions", () => {
  it("generates human-readable messages for orphaned IDs", () => {
    const partial = {
      links: [],
      orphaned_ids: [{ id: "REQ-003", defined_in: "requirements", expected_in: "basic-design" }],
      missing_ids: [],
      traceability_matrix: [],
    };
    const suggestions = generateSuggestions(partial);
    expect(suggestions[0]).toContain("REQ-003");
    expect(suggestions[0]).toContain("requirements");
    expect(suggestions[0]).toContain("basic-design");
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
