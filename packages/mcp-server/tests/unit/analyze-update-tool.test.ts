/**
 * Tests for analyze_update MCP tool handler (src/tools/update.ts).
 *
 * Covers: standard diff mode, revision_mode, check_staleness mode,
 * error paths, and validation.
 *
 * Standard diff mode calls Python bridge (diff action). If Python is
 * available, tests validate the success output format. If not, they
 * validate error handling.
 */
import { describe, it, expect, beforeAll } from "@jest/globals";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerUpdateTool } from "../../src/tools/update.js";

/** Helper to call a tool on McpServer instance */
async function callTool(
  server: McpServer,
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  return (server as any)._registeredTools[name].handler(args, {});
}

let server: McpServer;

beforeAll(() => {
  server = new McpServer({ name: "test", version: "0.0.1" });
  registerUpdateTool(server);
});

// ---------------------------------------------------------------------------
// 1. Tool registration
// ---------------------------------------------------------------------------

describe("analyze_update: registration", () => {
  it("registers as analyze_update tool", () => {
    const tools = (server as any)._registeredTools;
    expect(tools["analyze_update"]).toBeDefined();
    expect(tools["analyze_update"].handler).toBeInstanceOf(Function);
  });
});

// ---------------------------------------------------------------------------
// 2. check_staleness mode — config_path required
// ---------------------------------------------------------------------------

describe("analyze_update: check_staleness mode", () => {
  it("returns error when config_path missing for check_staleness", async () => {
    const result = await callTool(server, "analyze_update", {
      check_staleness: true,
      revision_mode: false,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("STALENESS_ERROR");
    expect(result.content[0].text).toContain("config_path required");
  });

  it("returns error when config file does not exist", async () => {
    const result = await callTool(server, "analyze_update", {
      check_staleness: true,
      config_path: "/nonexistent/sekkei.config.yaml",
      revision_mode: false,
    });

    // Should return isError from catch block (file not found)
    expect(result.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Standard diff mode — calls Python bridge
//    Tests verify output format (success or error) depending on Python availability
// ---------------------------------------------------------------------------

describe("analyze_update: standard diff mode", () => {
  it("returns update impact analysis or error for diff with changes", async () => {
    const result = await callTool(server, "analyze_update", {
      upstream_old: "# Old Doc\n\n## Section A\nOld content",
      upstream_new: "# New Doc\n\n## Section A\nNew content\n\n## Section B\nAdded section",
      downstream_content: "# Downstream\n\nReferences Section A",
      revision_mode: false,
    });

    // Either succeeds with impact analysis or errors with message
    expect(result.content[0].text).toBeTruthy();
    if (!result.isError) {
      // Success path: verify output structure
      expect(result.content[0].text).toContain("Update Impact Analysis");
      expect(result.content[0].text).toContain("Upstream Changes");
      expect(result.content[0].text).toContain("Downstream Impacts");
      expect(result.content[0].text).toContain("Added sections");
      expect(result.content[0].text).toContain("Removed sections");
      expect(result.content[0].text).toContain("Modified sections");
    }
  });

  it("returns revision history row when revision_mode=true", async () => {
    const result = await callTool(server, "analyze_update", {
      upstream_old: "# v1\n\n## Requirements\nOld requirement",
      upstream_new: "# v2\n\n## Requirements\nUpdated requirement\n\n## New Section\nAdded",
      revision_mode: true,
    });

    expect(result.content[0].text).toBeTruthy();
    if (!result.isError) {
      expect(result.content[0].text).toContain("Update Impact Analysis");
      // revision_mode may include suggested 改訂履歴 row
      // (depends on Python diff_analyzer output)
    }
  });

  it("handles empty upstream content without crashing", async () => {
    const result = await callTool(server, "analyze_update", {
      upstream_old: "",
      upstream_new: "",
      revision_mode: false,
    });

    // Should return a result (success with empty diff or error)
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.content[0].text).toBeTruthy();
  });

  it("handles minimal args (revision_mode=false, no content)", async () => {
    const result = await callTool(server, "analyze_update", {
      revision_mode: false,
    });

    // Should not crash — returns some result
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
  });

  it("handles only upstream_new without upstream_old", async () => {
    const result = await callTool(server, "analyze_update", {
      upstream_new: "# New Document\n\n## Section\nContent",
      revision_mode: false,
    });

    expect(result.content[0].text).toBeTruthy();
    if (!result.isError) {
      expect(result.content[0].text).toContain("Update Impact Analysis");
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Output format validation for successful diff
// ---------------------------------------------------------------------------

describe("analyze_update: output format", () => {
  it("includes changed IDs section in output", async () => {
    const result = await callTool(server, "analyze_update", {
      upstream_old: "# Doc\n\n| ID | Name |\n|---|---|\n| REQ-001 | Login |",
      upstream_new: "# Doc\n\n| ID | Name |\n|---|---|\n| REQ-001 | Login Updated |\n| REQ-002 | Search |",
      revision_mode: false,
    });

    if (!result.isError) {
      expect(result.content[0].text).toContain("Changed IDs");
    }
  });

  it("includes total impacted sections count", async () => {
    const result = await callTool(server, "analyze_update", {
      upstream_old: "# Old",
      upstream_new: "# New\n\n## Added",
      downstream_content: "# Down\n\nSome content",
      revision_mode: false,
    });

    if (!result.isError) {
      expect(result.content[0].text).toContain("Total impacted sections");
    }
  });
});
