// ---------------------------------------------------------------------------
// DAI Platform – Data Table Component
// ---------------------------------------------------------------------------
// Displays tabular data with sticky header, type-colored column badges,
// alternating row colors, null handling, and pagination.
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// ---------------------------------------------------------------------------
// Type badge color mapping
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<string, string> = {
  VARCHAR: 'bg-blue-100 text-blue-700 border-blue-200',
  STRING: 'bg-blue-100 text-blue-700 border-blue-200',
  TEXT: 'bg-blue-100 text-blue-700 border-blue-200',
  INTEGER: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  BIGINT: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  INT: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  DATE: 'bg-purple-100 text-purple-700 border-purple-200',
  TIMESTAMP: 'bg-purple-100 text-purple-700 border-purple-200',
  DATETIME: 'bg-purple-100 text-purple-700 border-purple-200',
  DOUBLE: 'bg-orange-100 text-orange-700 border-orange-200',
  FLOAT: 'bg-orange-100 text-orange-700 border-orange-200',
  DECIMAL: 'bg-orange-100 text-orange-700 border-orange-200',
  BOOLEAN: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  BOOL: 'bg-yellow-100 text-yellow-700 border-yellow-200',
}

function getTypeColor(type: string): string {
  const upper = type.toUpperCase()
  return TYPE_COLORS[upper] ?? 'bg-gray-100 text-gray-600 border-gray-200'
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataTableProps {
  columns: string[]
  columnTypes: string[]
  rows: unknown[][]
  totalCount: number
  pageSize?: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DataTable({
  columns,
  columnTypes,
  rows,
  totalCount,
  pageSize = 100,
}: DataTableProps) {
  const [page, setPage] = useState(0)

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const startRow = page * pageSize + 1
  const endRow = Math.min((page + 1) * pageSize, totalCount)

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white">
      {/* Scrollable table area */}
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full border-collapse text-sm">
          {/* Sticky header */}
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr className="border-b border-gray-200">
              {/* Row number column */}
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-400 whitespace-nowrap">
                #
              </th>
              {columns.map((col, i) => (
                <th
                  key={col}
                  className="px-3 py-2.5 text-left whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-700">
                      {col}
                    </span>
                    {columnTypes[i] && (
                      <span
                        className={cn(
                          'inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none',
                          getTypeColor(columnTypes[i]),
                        )}
                      >
                        {columnTypes[i]}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={cn(
                  'border-b border-gray-100 transition-colors hover:bg-blue-50/50',
                  rowIdx % 2 === 1 && 'bg-gray-50/50',
                )}
              >
                {/* Row number */}
                <td className="px-3 py-2 text-xs text-gray-400 tabular-nums">
                  {startRow + rowIdx}
                </td>
                {row.map((cell, colIdx) => (
                  <td
                    key={colIdx}
                    className="max-w-[300px] truncate px-3 py-2 text-gray-700"
                  >
                    {cell === null || cell === undefined ? (
                      <span className="italic text-gray-400">null</span>
                    ) : (
                      String(cell)
                    )}
                  </td>
                ))}
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-3 py-12 text-center text-gray-400"
                >
                  No data to display
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50/50 px-4 py-2.5">
        <span className="text-xs text-gray-500">
          Showing{' '}
          <span className="font-medium text-gray-700">
            {totalCount === 0 ? 0 : startRow}
          </span>
          {' - '}
          <span className="font-medium text-gray-700">{endRow}</span>
          {' of '}
          <span className="font-medium text-gray-700">
            {totalCount.toLocaleString()}
          </span>
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <Badge variant="secondary" className="tabular-nums">
            {page + 1} / {totalPages}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
