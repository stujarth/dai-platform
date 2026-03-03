// ---------------------------------------------------------------------------
// DAI Platform – Pipeline Store (Zustand)
// ---------------------------------------------------------------------------
// Manages the React Flow pipeline canvas state: nodes, edges, selection, and
// the ability to build a pipeline graph from the wizard's configured state.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import type { Node, Edge, NodeChange, EdgeChange, Connection } from '@xyflow/react';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface PipelineState {
  /** Nodes currently on the pipeline canvas. */
  nodes: Node[];
  /** Edges connecting the pipeline nodes. */
  edges: Edge[];
  /** ID of the currently selected node, or null. */
  selectedNode: string | null;

  // -- Actions ---------------------------------------------------------------
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  selectNode: (id: string | null) => void;
  /** Populate the pipeline from wizard state. */
  buildFromWizard: (
    source: string | null,
    table: string | null,
    transforms: unknown[],
    charts: unknown[],
  ) => void;
  /** Remove all nodes and edges from the canvas. */
  clear: () => void;
  /** Auto-layout all nodes in a horizontal chain. */
  autoLayout: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _nodeId = 0;
function nextId(prefix: string) {
  _nodeId += 1;
  return `${prefix}-${_nodeId}`;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePipelineStore = create<PipelineState>()((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,

  onNodesChange: (changes) =>
    set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) })),

  onEdgesChange: (changes) =>
    set((state) => ({ edges: applyEdgeChanges(changes, state.edges) })),

  onConnect: (connection) =>
    set((state) => ({ edges: addEdge(connection, state.edges) })),

  selectNode: (id) => set({ selectedNode: id }),

  clear: () => {
    _nodeId = 0;
    set({ nodes: [], edges: [], selectedNode: null });
  },

  autoLayout: () => {
    const { nodes, edges } = get();
    if (nodes.length === 0) return;

    // Topological sort to determine order
    const adjacency = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const node of nodes) {
      adjacency.set(node.id, []);
      inDegree.set(node.id, 0);
    }

    for (const edge of edges) {
      adjacency.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDeg);
        if (newDeg === 0) queue.push(neighbor);
      }
    }

    // For any nodes not reached (cycles / disconnected), append them
    for (const node of nodes) {
      if (!sorted.includes(node.id)) sorted.push(node.id);
    }

    const xGap = 300;
    const yCenter = 150;

    const updatedNodes = nodes.map((node) => {
      const index = sorted.indexOf(node.id);
      return {
        ...node,
        position: { x: index * xGap, y: yCenter },
      };
    });

    set({ nodes: updatedNodes });
  },

  buildFromWizard: (source, table, transforms, charts) => {
    _nodeId = 0;

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const xGap = 300;
    const yBase = 150;

    // 1. Source node
    const sourceId = nextId('source');
    nodes.push({
      id: sourceId,
      type: 'source',
      position: { x: 0, y: yBase },
      data: {
        label: source ?? 'Data Source',
        rows: null,
        columns: null,
      },
    });

    let prevId = sourceId;

    // 2. Raw data / table node
    if (table) {
      const tableId = nextId('transform');
      nodes.push({
        id: tableId,
        type: 'transform',
        position: { x: xGap, y: yBase },
        data: {
          label: table,
          transformType: 'raw_table',
        },
      });
      edges.push({
        id: `e-${prevId}-${tableId}`,
        source: prevId,
        target: tableId,
        animated: true,
      });
      prevId = tableId;
    }

    // 3. Transform nodes
    if (Array.isArray(transforms)) {
      transforms.forEach((t, i) => {
        const tId = nextId('transform');
        const transform = t as Record<string, unknown>;
        nodes.push({
          id: tId,
          type: 'transform',
          position: { x: (i + 2) * xGap, y: yBase },
          data: {
            label:
              (transform.name as string) ??
              (transform.transform_type as string) ??
              `Transform ${i + 1}`,
            transformType: transform.transform_type ?? 'custom',
          },
        });
        edges.push({
          id: `e-${prevId}-${tId}`,
          source: prevId,
          target: tId,
          animated: true,
        });
        prevId = tId;
      });
    }

    // 4. Dashboard / destination node
    const dashId = nextId('destination');
    const chartCount = Array.isArray(charts) ? charts.length : 0;
    nodes.push({
      id: dashId,
      type: 'destination',
      position: {
        x: (nodes.length) * xGap,
        y: yBase,
      },
      data: {
        label: 'Dashboard',
        chartCount,
      },
    });
    edges.push({
      id: `e-${prevId}-${dashId}`,
      source: prevId,
      target: dashId,
      animated: true,
    });

    set({ nodes, edges, selectedNode: null });
  },
}));
