import { useMemo } from "react"

import { useBlobText } from "../../hooks/use-blob-text"
import { parseTable } from "../../utils/table"
import { TruncatedNote } from "./truncated-note"
import type { ViewerProps } from "./types"

/** A CSV or TSV file as a table, its first row as the header. */
export function TableViewer({ blob }: ViewerProps) {
  const read = useBlobText(blob)
  const table = useMemo(() => read && parseTable(read.text, { cut: read.truncated }), [read])
  if (!table) return null

  const { header, rows, totalRows } = table
  return (
    <div className="p-4">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-surface-subtle">
            <tr>
              {header.map((cell, i) => (
                <th key={i} className="border-b px-2 py-1 text-left font-semibold whitespace-nowrap">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="border-b last:border-b-0">
                {row.map((cell, c) => (
                  <td key={c} className="px-2 py-1 align-top whitespace-pre-wrap">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {read?.truncated ? (
        <TruncatedNote />
      ) : (
        rows.length < totalRows && <TruncatedNote shown={`${rows.length} of ${totalRows} rows`} />
      )}
    </div>
  )
}
