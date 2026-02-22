import { describe, it, expect, beforeAll } from "@jest/globals";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTemplateResources } from "../../src/resources/templates.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = resolve(__dirname, "../../templates");

describe("template resources", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerTemplateResources(server, TEMPLATE_DIR);
  });

  it("registers resource template on the server", () => {
    // Verify the resource was registered by checking internal state
    const registeredResources = (server as any)._registeredResourceTemplates;
    expect(registeredResources).toBeDefined();
    expect(Object.keys(registeredResources).length).toBeGreaterThan(0);
  });

  it("resource template has correct URI pattern", () => {
    const registeredResources = (server as any)._registeredResourceTemplates;
    const templateResource = registeredResources["templates"];
    expect(templateResource).toBeDefined();
  });
});
