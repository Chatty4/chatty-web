import Papa from "papaparse"

/** The rows a table preview draws; a longer file is downloaded to see the rest. */
export const TABLE_PREVIEW_MAX_ROWS = 1000

export type Table = { header: string[]; rows: string[][]; totalRows: number }

/**
 * A CSV or TSV file's first row as the header and the rows after it, up to `maxRows`.
 * The separator is detected. `cut` drops the last line, which a file read only in part may have cut.
 */
export function parseTable(text: string, { maxRows = TABLE_PREVIEW_MAX_ROWS, cut = false } = {}): Table {
  const { data } = Papa.parse<string[]>(text, { skipEmptyLines: true })
  const lines = cut ? data.slice(0, -1) : data
  const [header = [], ...rows] = lines
  return { header, rows: rows.slice(0, maxRows), totalRows: rows.length }
}
