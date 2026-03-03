// ---------------------------------------------------------------------------
// DAI Platform – Transform Node (React Flow custom node)
// ---------------------------------------------------------------------------
// Represents a data transformation step in the pipeline. Blue accent with
// input handle on left and output handle on right.
// ---------------------------------------------------------------------------

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Filter, Wand2 } from 'lucide-react';

function TransformNode({ data }: NodeProps) {
  const label = (data.label as string) ?? 'Transform';
  const transformType = (data.transformType as string) ?? 'custom';

  // Choose icon based on transform type
  const Icon = transformType === 'filter' ? Filter : Wand2;

  return (
    <div className="min-w-[200px] rounded-lg border border-gray-200 border-l-4 border-l-blue-500 bg-white px-4 py-3 shadow-sm">
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-blue-500 !bg-white"
      />
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-semibold text-gray-900">{label}</span>
      </div>
      <p className="mt-1 text-xs text-gray-500 capitalize">{transformType.replace(/_/g, ' ')}</p>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-blue-500 !bg-white"
      />
    </div>
  );
}

export default memo(TransformNode);
