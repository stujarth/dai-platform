// ---------------------------------------------------------------------------
// DAI Platform – Source Node (React Flow custom node)
// ---------------------------------------------------------------------------
// Represents a data source in the pipeline canvas. Green accent, database
// icon, and output handle on the right.
// ---------------------------------------------------------------------------

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Database } from 'lucide-react';

function SourceNode({ data }: NodeProps) {
  const label = (data.label as string) ?? 'Data Source';
  const rows = data.rows as number | null;
  const columns = data.columns as number | null;

  return (
    <div className="min-w-[200px] rounded-lg border border-gray-200 border-l-4 border-l-emerald-500 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-emerald-600" />
        <span className="text-sm font-semibold text-gray-900">{label}</span>
      </div>
      {(rows !== null || columns !== null) && (
        <p className="mt-1 text-xs text-gray-500">
          {rows !== null && <span>{rows.toLocaleString()} rows</span>}
          {rows !== null && columns !== null && <span> &middot; </span>}
          {columns !== null && <span>{columns} columns</span>}
        </p>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-emerald-500 !bg-white"
      />
    </div>
  );
}

export default memo(SourceNode);
