/**
 * Sekkei error classes with typed error codes.
 * All errors sanitize output before returning to MCP clients.
 */

export type SekkeiErrorCode =
  | "TEMPLATE_NOT_FOUND"
  | "INVALID_DOC_TYPE"
  | "INVALID_LANGUAGE"
  | "PARSE_ERROR"
  | "CONFIG_ERROR"
  | "GENERATION_FAILED"
  | "VALIDATION_FAILED"
  | "MANIFEST_ERROR"
  | "MOCKUP_ERROR"
  | "CODE_ANALYSIS_FAILED"
  | "STALENESS_ERROR"
  | "STRUCTURE_RULES_ERROR"
  | "GOOGLE_EXPORT_FAILED"
  | "BACKLOG_SYNC_FAILED"
  | "RFP_WORKSPACE_ERROR"
  | "RFP_PHASE_ERROR"
  | "CHANGE_REQUEST_ERROR"
  | "PLAN_ERROR";

export class SekkeiError extends Error {
  constructor(
    public readonly code: SekkeiErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "SekkeiError";
  }

  /** Return a client-safe message (no stack traces or internal details) */
  toClientMessage(): string {
    return `[${this.code}] ${this.message}`;
  }
}
