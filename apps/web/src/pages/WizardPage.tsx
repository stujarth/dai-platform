// ---------------------------------------------------------------------------
// DAI Platform -- Wizard Page
// ---------------------------------------------------------------------------
// Five-step data wizard that walks the user through:
//   1. Select / upload a data source
//   2. Choose a table
//   3. Preview & explore data
//   4. Apply transforms
//   5. Generate report & dashboard
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Database,
  FileUp,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Sparkles,
  Table2,
  TrendingDown,
  TrendingUp,
  Upload,
  Wand2,
  Workflow,
} from 'lucide-react'

import { useWizardStore } from '@/stores/wizard-store'
import { useDataStore } from '@/stores/data-store'
import { useDashboardStore } from '@/stores/dashboard-store'

import StepProgress from '@/components/wizard/StepProgress'
import DataTable from '@/components/wizard/DataTable'
import SchemaViewer from '@/components/wizard/SchemaViewer'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

import {
  getSources,
  connectSource,
  uploadCSV,
  getTransformSuggestions,
  applyTransform,
} from '@/lib/api'

import type {
  DataSource,
  TransformSuggestion,
} from '@/lib/api'

// ---------------------------------------------------------------------------
// Step 1 -- Select Source
// ---------------------------------------------------------------------------

function StepSelectSource() {
  const { selectSource, setStep, completeStep } = useWizardStore()
  const { fetchTables } = useDataStore()

  const [sources, setSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getSources()
      .then((data) => {
        if (!cancelled) setSources(data)
      })
      .catch((err) => {
        if (!cancelled) toast.error(`Failed to load sources: ${err.message}`)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleConnect = useCallback(
    async (source: DataSource) => {
      setConnectingId(source.id)
      try {
        await connectSource(source.id)
        await fetchTables()
        selectSource(source)
        completeStep(1)
        setStep(2)
        toast.success(`Connected to ${source.name}`)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Connection failed'
        toast.error(message)
      } finally {
        setConnectingId(null)
      }
    },
    [selectSource, setStep, completeStep, fetchTables],
  )

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      setUploading(true)
      try {
        const result = await uploadCSV(file)
        await fetchTables()
        selectSource({
          id: result.table_name,
          name: file.name,
          type: 'csv',
          icon: '\uD83D\uDCC4',
          status: 'connected',
          description: `${result.row_count.toLocaleString()} rows, ${result.schema_info.length} columns`,
        })
        completeStep(1)
        setStep(2)
        toast.success(`Uploaded ${file.name} (${result.row_count.toLocaleString()} rows)`)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        toast.error(message)
      } finally {
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [selectSource, setStep, completeStep, fetchTables],
  )

  return (
    <div className="space-y-8">
      {/* Section heading */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Select a Data Source</h2>
        <p className="mt-1 text-sm text-gray-500">
          Connect to an existing data source or upload a CSV file to get started.
        </p>
      </div>

      {/* Source cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="mt-2 h-5 w-32" />
                <Skeleton className="mt-1 h-4 w-48" />
              </CardHeader>
              <CardFooter>
                <Skeleton className="h-9 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map((source) => {
            const isAvailable = source.status === 'available'
            const isConnecting = connectingId === source.id

            return (
              <Card
                key={source.id}
                className={
                  !isAvailable ? 'opacity-60' : 'hover:shadow-md transition-shadow'
                }
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <span className="text-3xl" role="img" aria-label={source.name}>
                      {source.icon}
                    </span>
                    <Badge
                      variant={isAvailable ? 'secondary' : 'outline'}
                      className={
                        isAvailable
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          : 'text-gray-400'
                      }
                    >
                      {isAvailable ? 'Available' : 'Coming Soon'}
                    </Badge>
                  </div>
                  <CardTitle className="text-base mt-2">{source.name}</CardTitle>
                  <CardDescription>{source.description}</CardDescription>
                </CardHeader>
                <CardFooter>
                  {isAvailable ? (
                    <Button
                      onClick={() => handleConnect(source)}
                      disabled={isConnecting || connectingId !== null}
                      size="sm"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Database className="h-4 w-4" />
                          Connect
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" disabled>
                      Coming Soon
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* File upload area */}
      <Card className="border-dashed border-2 hover:border-blue-400 transition-colors">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <div className="rounded-full bg-blue-50 p-4 mb-4">
            <Upload className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Upload a CSV File</h3>
          <p className="mt-1 mb-4 text-sm text-gray-500 max-w-md">
            Drag and drop or click to browse. Supports .csv files up to 100 MB.
          </p>
          <Input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            id="csv-upload"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <FileUp className="h-4 w-4" />
                Choose File
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2 -- Choose Table
// ---------------------------------------------------------------------------

function StepChooseTable() {
  const { setActiveTable, setStep, completeStep } = useWizardStore()
  const { tables, isLoading, fetchTables, fetchSchema, fetchPreview } = useDataStore()

  useEffect(() => {
    if (tables.length === 0) {
      fetchTables()
    }
  }, [tables.length, fetchTables])

  const handleSelectTable = useCallback(
    async (tableName: string) => {
      setActiveTable(tableName)
      // Start schema and preview fetches in parallel
      fetchSchema(tableName)
      fetchPreview(tableName)
      completeStep(2)
      setStep(3)
    },
    [setActiveTable, setStep, completeStep, fetchSchema, fetchPreview],
  )

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Choose a Table</h2>
        <p className="mt-1 text-sm text-gray-500">
          Select the table you want to explore and transform.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-2 h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tables.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Table2 className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">No tables found. Go back and connect a data source.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                useWizardStore.getState().setStep(1)
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sources
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((table) => (
            <Card
              key={table.name}
              className="cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
              onClick={() => handleSelectTable(table.name)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{table.name}</CardTitle>
                  <Badge variant="secondary" className="text-[10px]">
                    {table.source_type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Table2 className="h-3.5 w-3.5" />
                    {table.row_count.toLocaleString()} rows
                  </span>
                  <span className="flex items-center gap-1">
                    <Database className="h-3.5 w-3.5" />
                    {table.column_count} columns
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-start pt-4">
        <Button
          variant="outline"
          onClick={() => useWizardStore.getState().setStep(1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3 -- Preview & Explore
// ---------------------------------------------------------------------------

function StepPreviewExplore() {
  const { activeTable, setStep, completeStep } = useWizardStore()
  const { currentSchema, previewData, isLoading, fetchSchema, fetchPreview } =
    useDataStore()

  useEffect(() => {
    if (activeTable && !previewData) {
      fetchPreview(activeTable)
    }
    if (activeTable && !currentSchema) {
      fetchSchema(activeTable)
    }
  }, [activeTable, previewData, currentSchema, fetchPreview, fetchSchema])

  const handleNext = useCallback(() => {
    completeStep(3)
    setStep(4)
  }, [completeStep, setStep])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Preview & Explore</h2>
        <p className="mt-1 text-sm text-gray-500">
          Review your data before applying transforms.
          {activeTable && (
            <span className="ml-1 font-mono text-gray-700">{activeTable}</span>
          )}
        </p>
      </div>

      {isLoading && !previewData ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
          {/* Table skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
          {/* Schema skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-6 w-20" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
          {/* Data table */}
          <div className="min-w-0">
            {previewData ? (
              <DataTable
                columns={previewData.columns}
                columnTypes={previewData.column_types}
                rows={previewData.rows}
                totalCount={previewData.total_count}
                pageSize={previewData.page_size}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-400">
                  No preview data available.
                </CardContent>
              </Card>
            )}
          </div>

          {/* Schema sidebar */}
          <div className="min-w-0">
            {currentSchema && activeTable ? (
              <SchemaViewer schema={currentSchema} tableName={activeTable} />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-gray-400 text-sm">
                  Loading schema...
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={() => useWizardStore.getState().setStep(2)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleNext} disabled={isLoading}>
          Next
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 4 -- Transform
// ---------------------------------------------------------------------------

function StepTransform() {
  const { activeTable, transforms, addTransform, setStep, completeStep } =
    useWizardStore()

  const [suggestions, setSuggestions] = useState<TransformSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [applyingIdx, setApplyingIdx] = useState<number | null>(null)

  useEffect(() => {
    if (!activeTable) return
    let cancelled = false
    setLoading(true)
    getTransformSuggestions(activeTable)
      .then((data) => {
        if (!cancelled) setSuggestions(data)
      })
      .catch((err) => {
        if (!cancelled)
          toast.error(`Failed to load suggestions: ${err.message}`)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeTable])

  const handleApply = useCallback(
    async (suggestion: TransformSuggestion, index: number) => {
      if (!activeTable) return
      setApplyingIdx(index)
      try {
        const result = await applyTransform({
          table: activeTable,
          transform_type: suggestion.transform_type,
          params: suggestion.params,
        })
        addTransform({
          ...suggestion,
          result_table: result.table_name,
          result_row_count: result.row_count,
        })
        toast.success(`Applied "${suggestion.name}" successfully`)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Transform failed'
        toast.error(message)
      } finally {
        setApplyingIdx(null)
      }
    },
    [activeTable, addTransform],
  )

  const handleNext = useCallback(() => {
    completeStep(4)
    setStep(5)
  }, [completeStep, setStep])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transform Data</h2>
          <p className="mt-1 text-sm text-gray-500">
            AI-suggested transforms for{' '}
            <span className="font-mono text-gray-700">{activeTable}</span>.
            Apply any that look useful.
          </p>
        </div>
        {transforms.length > 0 && (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            {transforms.length} applied
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-44" />
                <Skeleton className="mt-2 h-4 w-60" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full rounded" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-20" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Wand2 className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">
              No transform suggestions available for this table.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {suggestions.map((suggestion, idx) => {
            const isApplying = applyingIdx === idx
            const alreadyApplied = transforms.some(
              (t) =>
                typeof t === 'object' &&
                t !== null &&
                'transform_type' in t &&
                (t as { transform_type: string }).transform_type ===
                  suggestion.transform_type,
            )

            return (
              <Card
                key={`${suggestion.transform_type}-${idx}`}
                className={alreadyApplied ? 'border-emerald-200 bg-emerald-50/30' : ''}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{suggestion.name}</CardTitle>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {suggestion.transform_type}
                    </Badge>
                  </div>
                  <CardDescription>{suggestion.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md bg-gray-900 p-3 overflow-x-auto">
                    <pre className="text-xs text-gray-100 font-mono whitespace-pre-wrap">
                      {suggestion.sql_preview}
                    </pre>
                  </div>
                </CardContent>
                <CardFooter>
                  {alreadyApplied ? (
                    <Button size="sm" variant="ghost" disabled>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Applied
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleApply(suggestion, idx)}
                      disabled={isApplying || applyingIdx !== null}
                    >
                      {isApplying ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Applying...
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4" />
                          Apply
                        </>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={() => useWizardStore.getState().setStep(3)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleNext}>
          Next
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 5 -- Report & Dashboard
// ---------------------------------------------------------------------------

function StepReport() {
  const navigate = useNavigate()
  const { activeTable, completeStep } = useWizardStore()
  const { charts, metrics, isGenerating, generateDashboard } = useDashboardStore()

  const [generated, setGenerated] = useState(false)

  const handleGenerate = useCallback(async () => {
    if (!activeTable) return
    try {
      await generateDashboard(activeTable)
      setGenerated(true)
      completeStep(5)
      toast.success('Dashboard generated successfully!')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Generation failed'
      toast.error(message)
    }
  }, [activeTable, generateDashboard, completeStep])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Report & Dashboard</h2>
        <p className="mt-1 text-sm text-gray-500">
          Generate an AI-powered dashboard from{' '}
          <span className="font-mono text-gray-700">{activeTable}</span>.
        </p>
      </div>

      {/* Generate button -- shown before generation or to regenerate */}
      {!generated && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-blue-50 p-4 mb-4">
              <Sparkles className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Ready to Generate
            </h3>
            <p className="text-sm text-gray-500 max-w-md mb-6">
              Our AI will analyze your data and create a set of charts and metrics
              tailored to your dataset.
            </p>
            <Button size="lg" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating Dashboard...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Generate Dashboard
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isGenerating && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="py-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-28" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="py-6">
                  <Skeleton className="h-5 w-40 mb-4" />
                  <Skeleton className="h-48 w-full rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Generated results */}
      {generated && !isGenerating && (
        <>
          {/* Metric cards */}
          {metrics.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {metrics.map((metric) => {
                const trendColor =
                  metric.trend === 'up'
                    ? 'text-emerald-600'
                    : metric.trend === 'down'
                      ? 'text-red-600'
                      : 'text-gray-500'
                const TrendIcon =
                  metric.trend === 'up'
                    ? TrendingUp
                    : metric.trend === 'down'
                      ? TrendingDown
                      : RefreshCw

                return (
                  <Card key={metric.id}>
                    <CardContent className="pt-6">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {metric.title}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">
                        {metric.formatted_value}
                      </p>
                      {metric.change_pct != null && (
                        <div className={`mt-1 flex items-center gap-1 text-xs ${trendColor}`}>
                          <TrendIcon className="h-3 w-3" />
                          <span>
                            {metric.change_pct > 0 ? '+' : ''}
                            {metric.change_pct.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Chart cards */}
          {charts.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {charts.map((chart) => (
                <Card key={chart.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{chart.title}</CardTitle>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {chart.chart_type}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      {chart.summary}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ReactECharts
                      option={chart.echarts_option}
                      style={{ height: 260 }}
                      notMerge
                      lazyUpdate
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Regenerate button */}
          <div className="flex justify-center">
            <Button variant="outline" onClick={handleGenerate} disabled={isGenerating}>
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </Button>
          </div>
        </>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-6">
        <Button
          variant="outline"
          onClick={() => useWizardStore.getState().setStep(4)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/pipeline')}
            disabled={!generated}
          >
            <Workflow className="h-4 w-4" />
            View Pipeline
          </Button>
          <Button onClick={() => navigate('/dashboard')} disabled={!generated}>
            <LayoutDashboard className="h-4 w-4" />
            View Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step router
// ---------------------------------------------------------------------------

const STEP_COMPONENTS: Record<number, React.FC> = {
  1: StepSelectSource,
  2: StepChooseTable,
  3: StepPreviewExplore,
  4: StepTransform,
  5: StepReport,
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function WizardPage() {
  const currentStep = useWizardStore((s) => s.currentStep)
  const StepComponent = STEP_COMPONENTS[currentStep] ?? StepSelectSource

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Step progress indicator */}
        <StepProgress />

        {/* Active step content */}
        <div className="mt-2">
          <StepComponent />
        </div>
      </div>
    </div>
  )
}
