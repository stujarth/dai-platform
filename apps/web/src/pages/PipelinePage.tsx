// ---------------------------------------------------------------------------
// DAI Platform – Pipeline Page
// ---------------------------------------------------------------------------
// Visual pipeline builder powered by React Flow. Users can build a pipeline
// graph from the wizard's configured state, auto-layout nodes, and inspect
// individual nodes via a sidebar panel.
// ---------------------------------------------------------------------------

import '@xyflow/react/dist/style.css';

import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  type NodeMouseHandler,
} from '@xyflow/react';
import { GitBranch, Layout, Trash2, X, GitCommitHorizontal } from 'lucide-react';

import { usePipelineStore } from '@/stores/pipeline-store';
import { useWizardStore } from '@/stores/wizard-store';

import SourceNode from '@/components/pipeline/nodes/SourceNode';
import TransformNode from '@/components/pipeline/nodes/TransformNode';
import DestinationNode from '@/components/pipeline/nodes/DestinationNode';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// ---------------------------------------------------------------------------
// Node type registry (must be stable reference to avoid React Flow remounts)
// ---------------------------------------------------------------------------

const nodeTypes = {
  source: SourceNode,
  transform: TransformNode,
  destination: DestinationNode,
};

// ---------------------------------------------------------------------------
// Pipeline Page
// ---------------------------------------------------------------------------

export default function PipelinePage() {
  // -- Pipeline store --------------------------------------------------------
  const nodes = usePipelineStore((s) => s.nodes);
  const edges = usePipelineStore((s) => s.edges);
  const selectedNode = usePipelineStore((s) => s.selectedNode);
  const onNodesChange = usePipelineStore((s) => s.onNodesChange);
  const onEdgesChange = usePipelineStore((s) => s.onEdgesChange);
  const onConnect = usePipelineStore((s) => s.onConnect);
  const selectNode = usePipelineStore((s) => s.selectNode);
  const buildFromWizard = usePipelineStore((s) => s.buildFromWizard);
  const clear = usePipelineStore((s) => s.clear);
  const autoLayout = usePipelineStore((s) => s.autoLayout);

  // -- Wizard store (read-only for building) ---------------------------------
  const selectedSource = useWizardStore((s) => s.selectedSource);
  const activeTable = useWizardStore((s) => s.activeTable);
  const transforms = useWizardStore((s) => s.transforms);
  const chartConfigs = useWizardStore((s) => s.chartConfigs);

  // -- Handlers --------------------------------------------------------------

  const handleBuildFromWizard = useCallback(() => {
    buildFromWizard(
      selectedSource?.name ?? null,
      activeTable,
      transforms,
      chartConfigs,
    );
  }, [buildFromWizard, selectedSource, activeTable, transforms, chartConfigs]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      selectNode(node.id);
    },
    [selectNode],
  );

  const handlePaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // -- Derived ---------------------------------------------------------------

  const selectedNodeData = useMemo(
    () => nodes.find((n) => n.id === selectedNode) ?? null,
    [nodes, selectedNode],
  );

  const hasNodes = nodes.length > 0;

  // -- Render ----------------------------------------------------------------

  return (
    <div className="flex h-full flex-col">
      {/* ----------------------------------------------------------------- */}
      {/* Toolbar                                                           */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBuildFromWizard}
        >
          <GitBranch className="h-4 w-4" />
          Build from Wizard
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={autoLayout}
          disabled={!hasNodes}
        >
          <Layout className="h-4 w-4" />
          Auto Layout
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={clear}
          disabled={!hasNodes}
        >
          <Trash2 className="h-4 w-4" />
          Clear
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary">
            {nodes.length} node{nodes.length !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="secondary">
            {edges.length} edge{edges.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Main content: canvas + optional sidebar                           */}
      {/* ----------------------------------------------------------------- */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* React Flow canvas */}
        <div className="flex-1">
          {hasNodes ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              onPaneClick={handlePaneClick}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              proOptions={{ hideAttribution: true }}
            >
              <Controls position="bottom-left" />
              <Background
                variant={BackgroundVariant.Dots}
                gap={16}
                size={1}
                color="#d1d5db"
              />
            </ReactFlow>
          ) : (
            /* -------------------------------------------------------------- */
            /* Empty state                                                     */
            /* -------------------------------------------------------------- */
            <div className="flex h-full flex-col items-center justify-center gap-4 bg-gray-50 text-center">
              <GitCommitHorizontal className="h-12 w-12 text-gray-300" />
              <h2 className="text-lg font-semibold text-gray-700">
                No pipeline nodes yet
              </h2>
              <p className="max-w-sm text-sm text-gray-500">
                Configure a data source and transforms in the Wizard, then click
                the button below to generate a pipeline graph.
              </p>
              <Button onClick={handleBuildFromWizard}>
                <GitBranch className="h-4 w-4" />
                Build from Wizard
              </Button>
            </div>
          )}
        </div>

        {/* -------------------------------------------------------------- */}
        {/* Selected node sidebar                                           */}
        {/* -------------------------------------------------------------- */}
        {selectedNodeData && (
          <aside className="w-72 shrink-0 border-l border-gray-200 bg-white">
            <Card className="h-full rounded-none border-0 shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold">
                  Node Details
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => selectNode(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>

              <CardContent className="space-y-3 text-sm">
                {/* Node ID */}
                <div>
                  <span className="text-xs font-medium uppercase text-gray-400">
                    ID
                  </span>
                  <p className="font-mono text-gray-700">
                    {selectedNodeData.id}
                  </p>
                </div>

                {/* Node type */}
                <div>
                  <span className="text-xs font-medium uppercase text-gray-400">
                    Type
                  </span>
                  <div className="mt-0.5">
                    <Badge
                      variant="secondary"
                      className="capitalize"
                    >
                      {selectedNodeData.type ?? 'default'}
                    </Badge>
                  </div>
                </div>

                {/* Node data */}
                <div>
                  <span className="text-xs font-medium uppercase text-gray-400">
                    Data
                  </span>
                  <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-gray-50 p-2 text-xs text-gray-600">
                    {JSON.stringify(selectedNodeData.data, null, 2)}
                  </pre>
                </div>

                {/* Position */}
                <div>
                  <span className="text-xs font-medium uppercase text-gray-400">
                    Position
                  </span>
                  <p className="text-gray-700">
                    x: {Math.round(selectedNodeData.position.x)}, y:{' '}
                    {Math.round(selectedNodeData.position.y)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </aside>
        )}
      </div>
    </div>
  );
}
