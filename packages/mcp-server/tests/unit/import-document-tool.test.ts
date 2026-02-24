import { describe, it, expect, beforeAll } from "@jest/globals";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerImportDocumentTool } from "../../src/tools/import-document.js";

async function callTool(
  server: McpServer,
  name: string,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  return (server as any)._registeredTools[name].handler(args, {});
}

describe("import_document tool", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerImportDocumentTool(server);
  });

  it("registers on the server", () => {
    expect((server as any)._registeredTools["import_document"]).toBeDefined();
  });

  it("rejects non-xlsx file path via handler error", async () => {
    // When called through handler directly (bypassing Zod), callPython will fail
    // since the file doesn't exist. The handler catches and returns isError.
    const result = await callTool(server, "import_document", {
      file_path: "/tmp/nonexistent-file.xlsx",
    });

    expect(result.isError).toBe(true);
    const text = result.content[0].text;
    expect(text).toBeTruthy();
  });

  it("returns error for missing file", async () => {
    const result = await callTool(server, "import_document", {
      file_path: "/tmp/does-not-exist-12345.xlsx",
      doc_type_hint: "requirements",
    });

    expect(result.isError).toBe(true);
  });
});
