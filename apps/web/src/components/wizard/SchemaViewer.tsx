// ---------------------------------------------------------------------------
// DAI Platform – Schema Viewer
// ---------------------------------------------------------------------------
// Sidebar card that displays column-level schema info for a table.
// Shows column name, type badge, nullable indicator, and sample values.
// ---------------------------------------------------------------------------

import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { TableProperties, CircleDot } from 'lucide-react'
import type { ColumnInfo } from '@/lib/api'

// ---------------------------------------------------------------------------
// Type badge styling
// ---------------------------------------------------------------------------

const TYPE_STYLES: Record<string, string> = {
  VARCHAR: 'bg-blue-100 text-blue-700',
  STRING: 'bg-blue-100 text-blue-700',
  TEXT: 'bg-blue-100 text-blue-700',
  INTEGER: 'bg-emerald-100 text-emerald-700',
  BIGINT: 'bg-emerald-100 text-emerald-700',
  INT: 'bg-emerald-100 text-emerald-700',
  DATE: 'bg-purple-100 text-purple-700',
  TIMESTAMP: 'bg-purple-100 text-purple-700',
  DATETIME: 'bg-purple-100 text-purple-700',
  DOUBLE: 'bg-orange-100 text-orange-700',
  FLOAT: 'bg-orange-100 text-orange-700',
  DECIMAL: 'bg-orange-100 text-orange-700',
  BOOLEAN: 'bg-yellow-100 text-yellow-700',
  BOOL: 'bg-yellow-100 text-yellow-700',
}

function getTypeStyle(type: string): string {
  return TYPE_STYLES[type.toUpperCase()] ?? 'bg-gray-100 text-gray-600'
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SchemaViewerProps {
  schema: ColumnInfo[]
  tableName: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SchemaViewer({ schema, tableName }: SchemaViewerProps) {
  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <TableProperties className="h-4 w-4 text-blue-600" />
          <CardTitle className="text-sm">Schema</CardTitle>
        </div>
        <p className="text-xs text-gray-500 font-mono">{tableName}</p>
      </CardHeader>

      <CardContent>
        <ul className="space-y-3">
          {schema.map((col) => (
            <li key={col.name} className="group">
              {/* Column name and type */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <CircleDot className="h-3 w-3 shrink-0 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {col.name}
                  </span>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none',
                    getTypeStyle(col.type),
                  )}
                >
                  {col.type}
                </span>
              </div>

              {/* Nullable indicator */}
              <div className="ml-[18px] mt-0.5 flex items-center gap-2">
                <span
                  className={cn(
                    'text-[10px]',
                    col.nullable ? 'text-amber-600' : 'text-gray-400',
                  )}
                >
                  {col.nullable ? 'NULLABLE' : 'NOT NULL'}
                </span>
              </div>

              {/* Sample values */}
              {col.sample_values && col.sample_values.length > 0 && (
                <div className="ml-[18px] mt-1">
                  <p className="text-[10px] text-gray-400 mb-0.5">Samples:</p>
                  <div className="flex flex-wrap gap-1">
                    {col.sample_values.slice(0, 3).map((val, i) => (
                      <span
                        key={i}
                        className="inline-block max-w-[120px] truncate rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 font-mono"
                      >
                        {val === null ? 'null' : String(val)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </li>
          ))}

          {schema.length === 0 && (
            <li className="text-center py-4 text-sm text-gray-400">
              No columns found
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  )
}
