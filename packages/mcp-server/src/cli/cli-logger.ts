/**
 * CLI logger — writes to stderr (fd 2) only, never pollutes stdout.
 */
import pino from "pino";

export const cliLogger = pino(
  {
    level: process.env.LOG_LEVEL ?? "info",
    name: "sekkei-cli",
  },
  pino.destination({ dest: 2 }) // fd 2 = stderr
);
