import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export class DashboardMcpClient {
  private client: Client | null = null
  private transport: StdioClientTransport | null = null
  private connected = false

  async connect(): Promise<void> {
    try {
      // Relative path in monorepo: packages/dashboard/dist/ → packages/mcp-server/dist/
      const serverPath = join(__dirname, '..', '..', '..', 'mcp-server', 'dist', 'index.js')

      this.transport = new StdioClientTransport({
        command: 'node',
        args: [serverPath],
      })

      this.client = new Client({ name: 'sekkei-dashboard', version: '0.1.0' }, {
        capabilities: {},
      })

      await this.client.connect(this.transport)
      this.connected = true
      process.stderr.write('MCP client connected\n')
    } catch (err) {
      this.connected = false
      process.stderr.write(`MCP client failed to connect: ${(err as Error).message}\n`)
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) await this.client.close()
      this.connected = false
    } catch {
      // Ignore disconnect errors
    }
  }

  isConnected(): boolean {
    return this.connected
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<string | null> {
    if (!this.client || !this.connected) return null

    try {
      const result = await this.client.callTool({ name, arguments: args })
      const content = result.content as Array<{ type: string; text?: string }>
      if (result.isError) return null
      return content?.[0]?.text ?? null
    } catch (err) {
      process.stderr.write(`MCP callTool(${name}) error: ${(err as Error).message}\n`)
      // Attempt reconnect once
      try {
        await this.connect()
      } catch {
        // Give up
      }
      return null
    }
  }
}
