/**
 * Google Workspace authentication — service account or OAuth2.
 * Dynamic import of googleapis/google-auth-library — not required for offline use.
 */
import { SekkeiError } from "./errors.js";
import { logger } from "./logger.js";

export interface GoogleAuthConfig {
  credentials_path: string;
  auth_type: "service_account" | "oauth2";
  folder_id?: string;
}

export async function getGoogleAuthClient(config: GoogleAuthConfig): Promise<unknown> {
  try {
    const { GoogleAuth } = await import("google-auth-library");

    if (config.auth_type === "service_account") {
      logger.info({ credentials_path: "[redacted]", auth_type: config.auth_type }, "Initializing Google service account auth");
      const auth = new GoogleAuth({
        keyFile: config.credentials_path,
        scopes: [
          "https://www.googleapis.com/auth/spreadsheets",
          "https://www.googleapis.com/auth/drive.file",
        ],
      });
      return auth.getClient();
    }

    // OAuth2: not yet supported — service account covers server-side use cases
    throw new SekkeiError(
      "GOOGLE_EXPORT_FAILED",
      "OAuth2 auth not yet supported — use service_account auth_type"
    );
  } catch (err) {
    if (err instanceof SekkeiError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ auth_type: config.auth_type }, "Google auth initialization failed");
    throw new SekkeiError("GOOGLE_EXPORT_FAILED", `Google auth failed: ${message}`);
  }
}
