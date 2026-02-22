/**
 * Export Sekkei markdown documents to Google Sheets.
 * Parses markdown tables → creates spreadsheet with one sheet per table.
 */
import { SekkeiError } from "./errors.js";
import { logger } from "./logger.js";

export interface ParsedTable {
  name: string;    // from preceding heading
  headers: string[];
  rows: string[][];
}

export interface SheetsExportResult {
  spreadsheet_id: string;
  spreadsheet_url: string;
  sheet_count: number;
  row_count: number;
}

/** Parse markdown tables from content. Each table gets a name from the nearest preceding heading. */
export function parseMarkdownTables(content: string): ParsedTable[] {
  const lines = content.split("\n");
  const tables: ParsedTable[] = [];
  let currentHeading = "Sheet1";
  let i = 0;

  while (i < lines.length) {
    // Track headings for table names
    const headingMatch = lines[i].match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      currentHeading = headingMatch[1].trim();
      i++;
      continue;
    }

    // Detect markdown table: line with pipes, next line is separator
    if (lines[i].includes("|") && i + 1 < lines.length && /^\|?\s*[-:]+/.test(lines[i + 1])) {
      // Parse header row
      const headers = lines[i]
        .split("|")
        .map(h => h.trim())
        .filter(h => h.length > 0);

      // Skip separator row
      i += 2;

      // Parse data rows
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && !lines[i].match(/^#{1,3}\s/)) {
        const row = lines[i]
          .split("|")
          .map(c => c.trim())
          .filter(c => c.length > 0);
        if (row.length > 0) rows.push(row);
        i++;
      }

      tables.push({ name: currentHeading, headers, rows });
      continue;
    }

    i++;
  }

  return tables;
}

/** Sanitize sheet name: escape single quotes, remove brackets, deduplicate */
function safeSheetName(name: string, idx: number, usedNames: Set<string>): string {
  let candidate = name.substring(0, 97).replace(/'/g, "''").replace(/[\[\]]/g, "");
  if (!candidate) candidate = `Sheet${idx + 1}`;
  if (usedNames.has(candidate)) candidate = `${candidate.substring(0, 93)}_${idx}`;
  usedNames.add(candidate);
  return candidate;
}

/** Export content to Google Sheets via API. */
export async function exportToGoogleSheets(opts: {
  content: string;
  docType: string;
  projectName: string;
  authClient: unknown;
  folderId?: string;
}): Promise<SheetsExportResult> {
  const tables = parseMarkdownTables(opts.content);
  if (tables.length === 0) {
    throw new SekkeiError("GOOGLE_EXPORT_FAILED", "No markdown tables found in content");
  }

  try {
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth: opts.authClient as Parameters<typeof google.sheets>[0]["auth"] });
    const drive = google.drive({ version: "v3", auth: opts.authClient as Parameters<typeof google.drive>[0]["auth"] });

    // 1. Create spreadsheet with deduplicated safe sheet names
    const title = `${opts.projectName} - ${opts.docType}`;
    const usedNames = new Set<string>();
    const sheetNames = tables.map((t, idx) => safeSheetName(t.name, idx, usedNames));
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
        sheets: sheetNames.map((name, idx) => ({
          properties: { sheetId: idx, title: name },
        })),
      },
    });

    const spreadsheetId = spreadsheet.data.spreadsheetId;
    if (!spreadsheetId) {
      throw new SekkeiError("GOOGLE_EXPORT_FAILED", "Spreadsheet creation returned no ID");
    }
    let totalRows = 0;

    // 2. Write data to each sheet
    const dataRequests = tables.map((table, idx) => {
      const values = [table.headers, ...table.rows];
      totalRows += table.rows.length;
      return sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${sheetNames[idx]}'!A1`,
        valueInputOption: "RAW",
        requestBody: { values },
      });
    });
    await Promise.all(dataRequests);

    // 3. Format headers (bold, frozen row)
    const formatRequests = tables.map((_, idx) => ([
      {
        repeatCell: {
          range: { sheetId: idx, startRowIndex: 0, endRowIndex: 1 },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true },
              backgroundColor: { red: 0.9, green: 0.9, blue: 0.95 },
            },
          },
          fields: "userEnteredFormat(textFormat,backgroundColor)",
        },
      },
      {
        updateSheetProperties: {
          properties: { sheetId: idx, gridProperties: { frozenRowCount: 1 } },
          fields: "gridProperties.frozenRowCount",
        },
      },
    ])).flat();

    if (formatRequests.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: formatRequests as any[] },
      });
    }

    // 4. Move to folder if specified
    if (opts.folderId) {
      try {
        await drive.files.update({
          fileId: spreadsheetId,
          addParents: opts.folderId,
          fields: "id, parents",
        });
        logger.info({ spreadsheetId, folderId: opts.folderId }, "Moved spreadsheet to Drive folder");
      } catch (err) {
        logger.warn({ err, folderId: opts.folderId }, "Failed to move spreadsheet to folder");
      }
    }

    logger.info({ spreadsheetId, sheetCount: tables.length, totalRows }, "Google Sheets export complete");

    return {
      spreadsheet_id: spreadsheetId,
      spreadsheet_url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      sheet_count: tables.length,
      row_count: totalRows,
    };
  } catch (err) {
    if (err instanceof SekkeiError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ docType: opts.docType }, "Google Sheets API call failed");
    throw new SekkeiError("GOOGLE_EXPORT_FAILED", `Google Sheets export failed: ${message}`);
  }
}
