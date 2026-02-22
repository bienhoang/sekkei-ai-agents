/**
 * Structured logger using pino, writing to stderr only.
 * Critical: MCP requires only JSON-RPC on stdout; all logs go to stderr.
 */
import pino from "pino";

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? "info",
    name: "sekkei",
  },
  pino.destination({ dest: 2 }) // fd 2 = stderr
);
