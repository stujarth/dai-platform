// ---------------------------------------------------------------------------
// DAI Platform – Dashboard Page
// ---------------------------------------------------------------------------
// Auto-generated dashboard showing AI-powered metrics and charts for the
// selected table.  Users pick a table, click "Generate Dashboard", and the
// backend returns metric cards + ECharts configurations.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  LayoutDashboard,
  Sparkles,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  BarChart3,
} from 'lucide-react';

import { useDashboardStore } from '@/stores/dashboard-store';
import { useWizardStore } from '@/stores/wizard-store';
import { useDataStore } from '@/stores/data-store';
import type { ChartConfig, MetricConfig } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectOption } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Ensure an echarts_option object has sensible grid defaults. */
function withGridDefaults(
  option: Record<string, unknown>,
): Record<string, unknown> {
  if (!option.grid) {
    return {
      ...option,
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    };
  }
  return option;
}

/** Return the appropriate trend icon component. */
function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'up') return <TrendingUp className="h-3 w-3" />;
  if (trend === 'down') return <TrendingDown className="h-3 w-3" />;
  return <Minus className="h-3 w-3" />;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricsRow({ metrics }: { metrics: MetricConfig[] }) {
  if (metrics.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.map((metric) => {
        const isPositive = metric.change_pct != null && metric.change_pct > 0;
        const isNegative = metric.change_pct != null && metric.change_pct < 0;

        return (
          <Card key={metric.id}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{metric.title}</p>
              <p className="text-2xl font-bold mt-1">{metric.formatted_value}</p>
              <div className="flex items-center gap-1.5 mt-2">
                {metric.change_pct != null && (
                  <span
                    className={`flex items-center gap-0.5 text-xs font-medium ${
                      isPositive
                        ? 'text-green-600'
                        : isNegative
                          ? 'text-red-600'
                          : 'text-gray-500'
                    }`}
                  >
                    <TrendIcon trend={metric.trend} />
                    {Math.abs(metric.change_pct).toFixed(1)}%
                  </span>
                )}
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {metric.trend}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ChartCard({
  chart,
  onRemove,
}: {
  chart: ChartConfig;
  onRemove: () => void;
}) {
  const option = withGridDefaults(chart.echarts_option);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">{chart.title}</CardTitle>
          <Badge variant="secondary">{chart.chart_type}</Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-gray-400 hover:text-gray-600"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: '350px' }} />
        {chart.summary && (
          <p className="text-sm text-gray-500 mt-3">{chart.summary}</p>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Skeleton metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Skeleton chart grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[350px] w-full" />
              <Skeleton className="h-3 w-full mt-3" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Generating your dashboard...</span>
      </div>
    </div>
  );
}

function EmptyState({ onGenerate, disabled }: { onGenerate: () => void; disabled: boolean }) {
  return (
    <div className="flex items-center justify-center py-20">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-10 pb-10 space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <BarChart3 className="h-8 w-8 text-gray-400" />
          </div>
          <CardTitle className="text-lg">No dashboard generated yet</CardTitle>
          <CardDescription>
            Select a table and click Generate to create an AI-powered dashboard
            with metrics and visualizations.
          </CardDescription>
          <Button onClick={onGenerate} disabled={disabled}>
            <Sparkles className="h-4 w-4" />
            Generate Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  // -- Store hooks ----------------------------------------------------------
  const { charts, metrics, isGenerating, generateDashboard, removeChart } =
    useDashboardStore();
  const activeTable = useWizardStore((s) => s.activeTable);
  const { tables, fetchTables } = useDataStore();

  // -- Local state ----------------------------------------------------------
  const [selectedTable, setSelectedTable] = useState<string>('');

  // -- Effects --------------------------------------------------------------

  // Fetch the table list on mount.
  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  // Default the selected table to the wizard's active table, or the first
  // available table once the list loads.
  useEffect(() => {
    if (selectedTable) return; // already chosen
    if (activeTable) {
      setSelectedTable(activeTable);
    } else {
      const first = tables[0];
      if (first) setSelectedTable(first.name);
    }
  }, [activeTable, tables, selectedTable]);

  // -- Handlers -------------------------------------------------------------

  const handleGenerate = () => {
    if (!selectedTable) return;
    generateDashboard(selectedTable);
  };

  const hasDashboard = charts.length > 0 || metrics.length > 0;

  // -- Render ---------------------------------------------------------------

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="w-52"
            disabled={isGenerating}
          >
            <SelectOption value="" disabled>
              Select a table...
            </SelectOption>
            {tables.map((t) => (
              <SelectOption key={t.name} value={t.name}>
                {t.name} ({t.row_count.toLocaleString()} rows)
              </SelectOption>
            ))}
          </Select>

          <Button
            onClick={handleGenerate}
            disabled={!selectedTable || isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isGenerating ? 'Generating...' : 'Generate Dashboard'}
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Loading state                                                       */}
      {/* ------------------------------------------------------------------ */}
      {isGenerating && <LoadingSkeleton />}

      {/* ------------------------------------------------------------------ */}
      {/* Dashboard content                                                   */}
      {/* ------------------------------------------------------------------ */}
      {!isGenerating && hasDashboard && (
        <>
          {/* Metrics row */}
          <MetricsRow metrics={metrics} />

          {/* Charts grid */}
          {charts.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {charts.map((chart) => (
                <ChartCard
                  key={chart.id}
                  chart={chart}
                  onRemove={() => removeChart(chart.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Empty state                                                         */}
      {/* ------------------------------------------------------------------ */}
      {!isGenerating && !hasDashboard && (
        <EmptyState
          onGenerate={handleGenerate}
          disabled={!selectedTable}
        />
      )}
    </div>
  );
}
