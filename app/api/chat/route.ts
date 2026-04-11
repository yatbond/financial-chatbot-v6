import { NextRequest, NextResponse } from 'next/server'
import { scanStructureSupabase, loadProjectDataSupabase, computeMetricsSupabase } from '@/lib/data/supabase-loader'
import { runQuery } from '@/lib/pipeline/index'
import { tokenize } from '@/lib/pipeline/tokenizer'
import { classify } from '@/lib/pipeline/classifier'
import { resolve } from '@/lib/pipeline/resolver'
import { handleAnalyze } from '@/lib/commands/analyze'
import { handleCompare } from '@/lib/commands/compare'
import { handleTrend } from '@/lib/commands/trend'
import { handleDetail } from '@/lib/commands/detail'
import { handleTotal } from '@/lib/commands/total'
import { handleList } from '@/lib/commands/list'
import { handleRisk } from '@/lib/commands/risk'
import { handleCashFlow } from '@/lib/commands/cashflow'
import { handleShortcuts, handleType } from '@/lib/commands/shortcuts'
import type { DetailContext } from '@/lib/pipeline/formatter'
import type { FinancialRow } from '@/lib/data/types'

export const dynamic = 'force-dynamic'

// In-memory session context for detail drill-down (per-project, ephemeral)
const sessionContexts = new Map<string, DetailContext>()

async function getProjectRows(projectId: string, year?: number, month?: number): Promise<FinancialRow[]> {
  return loadProjectDataSupabase(projectId, year, month)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'getStructure') {
      const { folders, projects } = await scanStructureSupabase()
      return Response.json({ folders, projects })
    }

    if (action === 'loadProject') {
      const { projectId, year, month } = body
      const rows = await getProjectRows(projectId, year, month)
      const metrics = await computeMetricsSupabase(projectId, year, month)

      const uniqueItemCodes = [...new Set(rows.map(r => r.itemCode))].filter(Boolean).sort()
      const uniqueDataTypes = [...new Set(rows.map(r => r.friendlyName))].filter(Boolean).sort()
      
      // DEBUG: include raw data for the 4 key metrics
      const allFinStatusGp3 = rows
        .filter(r => r.sheetName === 'Financial Status' && r.itemCode === '3')
      
      // Check what rawFinancialType values we actually have
      const rawTypes = new Set(allFinStatusGp3.map(r => r.rawFinancialType))
      console.log('DEBUG unique rawFinancialType values:', JSON.stringify([...rawTypes]))
      
      const debugMetrics = allFinStatusGp3
        .filter(r => {
          const raw = (r.rawFinancialType || '').toLowerCase()
          return raw.includes('business plan') || raw.includes('projection') || raw.includes('audit') || raw.includes('cash flow')
        })
        .map(r => ({ raw: r.rawFinancialType, norm: r.financialType, val: r.value }))
      
      console.log('DEBUG allFinStatusGp3 count:', allFinStatusGp3.length)
      console.log('DEBUG debugMetrics count:', debugMetrics.length)

      return Response.json({
        metrics,
        debug: {
          totalRows: rows.length,
          projectId,
          uniqueItemCodes,
          uniqueDataTypes,
          debugMetrics,
        },
      })
    }

    if (action === 'metrics') {
      const { projectId, year, month } = body
      const metrics = await computeMetricsSupabase(projectId, year, month)
      return Response.json({ metrics })
    }

    if (action === 'query') {
      const { projectId, year, month, question, context: rawContext } = body
      const rows = await getProjectRows(projectId, year, month)
      const context: DetailContext | null = rawContext ?? sessionContexts.get(projectId) ?? null

      const q = question.trim().toLowerCase()
      const response = await dispatchQuery(q, rows, context, projectId)
      return Response.json(response)
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err) {
    console.error('[API error]', err)
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: msg }, { status: 500 })
  }
}

async function dispatchQuery(
  q: string,
  rows: FinancialRow[],
  context: DetailContext | null,
  projectId: string,
): Promise<{ response: string; candidates: object[]; context?: DetailContext }> {

  // --- Shortcuts / help ---
  if (q === 'shortcuts' || q === 'help') {
    return { response: handleShortcuts(), candidates: [] }
  }
  if (q === 'type' || q === 'types') {
    return { response: handleType(), candidates: [] }
  }

  // --- Analyze ---
  if (q === 'analyze' || q === 'analyse') {
    return { response: handleAnalyze(rows), candidates: [] }
  }

  // --- Risk ---
  if (q === 'risk') {
    return { response: handleRisk(rows), candidates: [] }
  }

  // --- Cash flow ---
  if (q === 'cash flow' || q === 'cashflow' || q === 'cf') {
    return { response: handleCashFlow(rows), candidates: [] }
  }

  // Tokenize + classify for all other commands
  const tokens = classify(tokenize(q))
  const resolved = resolve(tokens)

  // --- Compare ---
  if (resolved.command === 'compare') {
    return { response: handleCompare(rows, resolved), candidates: [] }
  }

  // --- Trend ---
  if (resolved.command === 'trend') {
    return { response: handleTrend(rows, resolved), candidates: [] }
  }

  // --- List ---
  if (resolved.command === 'list') {
    const rest = q.replace(/^list\s*/, '').trim()
    return { response: handleList(rows, rest || undefined), candidates: [] }
  }

  // --- Total ---
  if (resolved.command === 'total') {
    const rest = q.replace(/^total\s*/, '').trim()
    return { response: handleTotal(rows, rest), candidates: [] }
  }

  // --- Detail ---
  if (resolved.command === 'detail') {
    const rest = q.replace(/^detail\s*/, '').trim()
    const result = handleDetail(rows, rest || undefined, context)
    if (result.context) {
      sessionContexts.set(projectId, result.context)
    }
    return { response: result.response, candidates: [], context: result.context }
  }

  // --- General query through full pipeline ---
  const result = runQuery(q, rows)
  if (result.context) {
    sessionContexts.set(projectId, result.context)
  }
  return {
    response: result.response,
    candidates: result.candidates,
    context: result.context,
  }
}