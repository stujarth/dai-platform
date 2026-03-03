// ---------------------------------------------------------------------------
// DAI Platform – Destination Node (React Flow custom node)
// ---------------------------------------------------------------------------
// Represents the output / dashboard destination in the pipeline. Purple
// accent with input handle on the left only.
// ---------------------------------------------------------------------------

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { BarChart3 } from 'lucide-react';

function DestinationNode({ data }: NodeProps) {
  const label = (data.label as string) ?? 'Dashboard';
  const chartCount = data.chartCount as number | undefined;

  return (
    <div className="min-w-[200px] rounded-lg border border-gray-200 border-l-4 border-l-purple-500 bg-white px-4 py-3 shadow-sm">
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-purple-500 !bg-white"
      />
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-purple-600" />
        <span className="text-sm font-semibold text-gray-900">{label}</span>
      </div>
      {chartCount !== undefined && chartCount > 0 && (
        <p className="mt-1 text-xs text-gray-500">
          {chartCount} chart{chartCount !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

export default memo(DestinationNode);
