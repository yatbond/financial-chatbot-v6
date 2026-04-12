# Financial Chatbot v6 — Product Development Document

*Created: 2026-04-10*
*Author: MJ (with Derrick Pang)*
*Status: Planning*

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Lessons from v5](#2-lessons-from-v5)
3. [Architecture](#3-architecture)
4. [Query Pipeline](#4-query-pipeline)
5. [Data Model](#5-data-model)
6. [Search Engine Specification](#6-search-engine-specification)
7. [Shortcut Commands](#7-shortcut-commands)
8. [Testing Strategy](#8-testing-strategy)
9. [Migration Plan](#9-migration-plan)
10. [File Structure](#10-file-structure)

---

## 1. Executive Summary

Financial Chatbot v6 is a rewrite of the query engine that powers the PolyU financial report chatbot. The UI and data pipeline remain the same — only the search/matching logic is being rebuilt.

**Goal:** Replace the 4,800-line monolithic route.ts with a clean, testable, deterministic query pipeline.

**Timeline:** 4-6 hours development + testing

**Deployment:** New Next.js app at `G:\My Drive\Ai Projects\2026-04-10 Financial Chatbot v6\`

---

## 2. Lessons from v5

### What went wrong

| Problem | Root Cause | Impact |
|---------|-----------|--------|
| 6+ bug cycles on sheet resolution | 5 overlapping keyword maps | Every fix broke something else |
| "budget" mapped to Business Plan | EXPLICIT_FINANCIAL_TYPE_MAP conflicted with CSV | Wrong financial type shown |
| "plan" matched "plant" | Single-word keywords not in FINANCIAL_TYPE_KEYWORDS | Wrong data type selected |
| "accrual accrual" counted as 1 | seenWords deduplication | Wrong sheet selected |
| Detail context lost on cold start | In-memory Map cache on serverless | Feature broken |
| 4,800 line monolith | No separation of concerns | Impossible to debug |

### Principles for v6

1. **One source of truth** — All keyword/acronym mappings come from CSV files, not hardcoded maps
2. **Deterministic pipeline** — Tokenize → Classify → Filter → Score → Return. No heuristics.
3. **Testable** — Every stage has unit tests with 20+ test cases
4. **No overlapping maps** — One config file, one resolver
5. **Explicit > Implicit** — When ambiguous, ask user. Never guess.

---

## 3. Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend    │────▶│  API Route    │────▶│  Query Engine │
│  (Next.js)    │     │  (handler.ts) │     │  (pipeline)   │
└──────────────┘     └──────────────┘     └──────────────┘
                                                  │
                                          ┌───────┴───────┐
                                          │               │
                                    ┌─────▼─────┐  ┌─────▼─────┐
                                    │  Config    │  │   Data     │
                                    │  (CSV)     │  │  (CSV)     │
                                    └───────────┘  └───────────┘
```

### Module Breakdown

```
lib/
├── pipeline/
│   ├── tokenizer.ts       # Step 1: Tokenize raw query
│   ├── classifier.ts      # Step 2: Classify each token (sheet/ftype/dtype/item/date)
│   ├── resolver.ts        # Step 3: Resolve classified tokens to data values
│   ├── filter.ts          # Step 4: Apply filters to dataset
│   ├── scorer.ts          # Step 5: Score and rank candidates
│   └── formatter.ts       # Step 6: Format response
├── config/
│   ├── loader.ts          # Load CSV config files
│   ├── types.ts           # TypeScript interfaces for config
│   └── mappings.ts        # Derived lookup tables (built from CSV)
├── commands/
│   ├── analyze.ts         # Analyze command handler
│   ├── compare.ts         # Compare command handler
│   ├── trend.ts           # Trend command handler
│   ├── detail.ts          # Detail drill-down handler
│   ├── total.ts           # Total sub-item handler
│   ├── list.ts            # List items handler
│   ├── risk.ts            # Risk analysis handler
│   └── shortcuts.ts       # Help/shortcuts handler
├── data/
│   ├── loader.ts          # Load and cache CSV data
│   └── types.ts           # FinancialRow interface
└── utils/
    ├── currency.ts        # Currency formatting
    └── dates.ts           # Date parsing
```

---

## 4. Query Pipeline

### Step 1: Tokenize

Split raw query into tokens. Apply acronym expansion ONCE.

```typescript
interface Token {
  raw: string           // Original word from user
  expanded: string      // After acronym expansion (e.g., "bp" → "business plan")
  type: TokenType       // UNKNOWN initially
}

enum TokenType {
  SHEET_NAME,
  FINANCIAL_TYPE,
  DATA_TYPE,
  ITEM_CODE,
  DATE_MONTH,
  DATE_YEAR,
  COMMAND,              // analyze, compare, trend, etc.
  NUMBER,               // Context-dependent (month count or month number)
  UNKNOWN
}
```

### Step 2: Classify

Each token gets classified based on the config. Classification is greedy but deterministic:

```
Priority order:
1. COMMAND keywords (analyze, compare, trend, detail, total, list, risk, type, shortcuts)
2. DATE patterns (month names, year numbers)
3. NUMBER patterns (standalone numbers)
4. SHEET_NAME exact match from config
5. FINANCIAL_TYPE from config (acronyms + full names)
6. DATA_TYPE from config (acronyms + full names)
7. ITEM_CODE pattern (digits with dots, e.g., "2.1")
8. UNKNOWN — try fuzzy match later
```

**Key rule:** A word is classified as SHEET_NAME only if it appears as an explicit sheet specifier (see Section 6).

### Step 3: Resolve

Convert classified tokens to actual data values:

```typescript
interface ResolvedQuery {
  command?: 'analyze' | 'compare' | 'trend' | 'detail' | 'total' | 'list' | 'risk' | 'type'
  sheet?: string          // Sheet_Name value
  financialType?: string  // Financial_Type value
  dataType?: string       // Data_Type value
  itemCode?: string       // Item_Code value
  month?: string          // Month value
  year?: string           // Year value
  number?: number         // Context-dependent number
  compareFrom?: ResolvedQuery  // For compare command
  compareTo?: ResolvedQuery    // For compare command
}
```

### Step 4: Filter

Apply resolved query to the dataset:

```
1. Filter by Sheet_Name (if specified)
2. Filter by Financial_Type (if specified)
3. Filter by Item_Code (if specified)
4. Filter by Data_Type (if specified)
5. Filter by Month/Year (if specified)
```

### Step 5: Score

Score all matching records for candidate ranking:

```typescript
interface ScoreWeights {
  exactSheetMatch: 100
  exactFinTypeMatch: 80
  exactDataTypeMatch: 60
  exactItemCodeMatch: 50
  monthMatch: 20
  yearMatch: 15
  // NO arbitrary bonuses. Period.
}
```

### Step 6: Format

Build response with:
- Filters applied
- Total value
- Top 5 candidates
- Suggestions if no results

---

## 5. Data Model

### CSV Schema (unchanged from v5)

```
Year, Month, Sheet_Name, Financial_Type, Item_Code, Data_Type, Category, Value, Match_Status, _source_file, _source_subfolder
```

### Financial Type Map (from CSV)

```csv
Raw_Financial_Type,Clean_Financial_Type,Acronyms
Budget Tender,Budget Tender,tender|tender budget
Budget Revision as at,Latest Budget,Latest budget|budget|bt|revision|rev|rev as at|budget revision
Business Plan,Business Plan,bp|business plan
Audit Report (WIP),WIP,wip|audit|audit report
Projection as at,Projection,projected|projection
Committed Value / Cost as at,Committed Cost,committed|committed cost|committed value
Accrual (Before Retention) as at,Accrual,accrual|accrued
Cash Flow Actual received & paid as at,Cash Flow,cf|cashflow|cash flow|cash
General,General,general|project info
```

### Sheet Names

| Sheet Name | Contains | Keyword |
|---|---|---|
| Financial Status | All financial types (latest snapshot) | — (default) |
| Budget Tender | Budget Tender only | tender |
| 1st Working Budget | 1st Working Budget only | 1wb |
| Latest Budget | Latest Budget only | budget, bt, rev, revision |
| Business Plan | Business Plan only | bp, plan |
| WIP | WIP only | wip, audit |
| Projection | Projection only | projection, projected |
| Committed Cost | Committed Cost only | committed |
| Accrual | Accrual only | accrual |
| Cash Flow | Cash Flow only | cf, cashflow, cash flow |

---

## 6. Search Engine Specification

### Sheet Resolution Rules

**The core rule:** Sheet_Name = Financial_Type keyword unless explicitly specified.

| Query Tokens | Sheet Resolution | Why |
|---|---|---|
| `committed plant` | Financial Status | 1 ftype keyword → default sheet |
| `committed committed plant` | Committed Cost | 2 same keywords → explicit sheet + ftype |
| `cashflow cf plant` | Cash Flow | 2 different ftype keywords → first = sheet |
| `committed plant oct` | Committed Cost | Month specified → must be monthly sheet |
| `bp income` | Financial Status | 1 ftype keyword → default sheet |
| `tender gp` | Financial Status | 1 ftype keyword → default sheet |

**Algorithm:**
```
1. Count how many tokens classify as FINANCIAL_TYPE
2. If count >= 2: first ftype token = SHEET_NAME, remaining = FINANCIAL_TYPE
3. If count == 1 AND month specified: that ftype = SHEET_NAME (monthly sheet needed)
4. If count == 1 AND no month: that ftype = FINANCIAL_TYPE, SHEET = Financial Status
5. If count == 0: SHEET = Financial Status, FINANCIAL_TYPE = undefined
```

### Data Type Resolution Rules

1. Check PARENT_ITEM_MAP for high-level items (cost→2, income→1, gp→3, etc.)
2. Use fuzzy matching against Data_Type list, EXCLUDING financial type keywords
3. Prefer exact word matches over substring matches
4. When tied, prefer shorter Item_Code (parent over child)

### Item Code Resolution Rules

1. Direct pattern match: "2.1", "1.3.2" etc.
2. PARENT_ITEM_MAP keywords: "cost"→2, "income"→1, "prelim"→2.1, "plant"→2.3, etc.
3. Derived from Data_Type if not explicitly specified

### Scoring Rules

**NO arbitrary bonuses.** Score = weighted sum of field matches:

| Match Type | Weight |
|---|---|
| Sheet exact match | 100 |
| Financial Type exact match | 80 |
| Data Type exact match | 60 |
| Item Code exact match | 50 |
| Month match | 20 |
| Year match | 15 |

Candidates are ranked by total score. Top 5 shown.

---

## 7. Shortcut Commands

### Commands (unchanged from v5)

| Command | Syntax | Description |
|---|---|---|
| analyze | `analyze` | 6-comparison financial analysis |
| compare | `compare A vs B` | Compare two financial datasets |
| trend | `trend [metric] [N]` | Show values over N months |
| list | `list`, `list more`, `list 2.2` | Browse item hierarchy |
| total | `total [item] [type]` | Sum sub-items under parent |
| detail | `detail`, `detail N`, `detail N.Y` | Drill into sub-items |
| risk | `risk` | Risk items across WIP/Committed/CF |
| cash flow | `cash flow` | 12-month GP summary |
| type | `type` | List all financial types |
| shortcuts | `shortcuts` / `help` | Show help |

### Detail Context Persistence

**v6 Solution:** Store detail context in the API response itself. Frontend sends context back with each "detail" request. No server-side state needed.

```typescript
interface QueryResponse {
  text: string
  candidates: Candidate[]
  context?: {
    itemCode: string
    sheetName: string
    financialType: string
    children: Array<{ code: string; name: string }>
  }
}
```

Frontend stores `context` and sends it back when user types "detail".

---

## 8. Testing Strategy

### Test Cases (minimum 30)

#### Sheet Resolution (8 tests)
```
✓ "committed plant" → Sheet=Financial Status, FType=Committed Cost
✓ "committed committed plant" → Sheet=Committed Cost, FType=Committed Cost
✓ "accrual accrual material" → Sheet=Accrual, FType=Accrual
✓ "cf cf cost" → Sheet=Cash Flow, FType=Cash Flow
✓ "committed plant oct" → Sheet=Committed Cost, Month=10
✓ "bp income" → Sheet=Financial Status, FType=Business Plan
✓ "tender gp" → Sheet=Financial Status, FType=Budget Tender
✓ "budget material" → Sheet=Financial Status, FType=Latest Budget
```

#### Financial Type Resolution (6 tests)
```
✓ "latest budget material" → FType=Latest Budget (not Budget Tender)
✓ "budget gp" → FType=Latest Budget (not Business Plan)
✓ "bp income" → FType=Business Plan
✓ "wip cost" → FType=WIP
✓ "projection prelim" → FType=Projection
✓ "tender gp" → FType=Budget Tender
```

#### Data Type Resolution (6 tests)
```
✓ "bp income" → DataType=Total Income, Item=1 (not Total Plant & Machinery)
✓ "committed plant" → DataType includes Plant
✓ "cost" → DataType=Less : Cost, Item=2
✓ "subcon vo" → DataType=Subcontractor Variations
✓ "gp" → DataType=Gross Profit, Item=3
✓ "prelim" → DataType=Preliminaries, Item=2.1
```

#### Commands (6 tests)
```
✓ "detail" after query → shows children
✓ "detail 2" → shows 2nd child
✓ "detail 2.1" → shows grandchild
✓ "total cost" → shows cost breakdown
✓ "trend gp 8" → prompts for financial type
✓ "list" → shows tier 1 items
```

#### Scoring (4 tests)
```
✓ "committed contra charge" → correct row selected (not sum across all months)
✓ No Financial Status bias in scoring
✓ No common item code bonus
✓ Exact match > partial match
```

---

## 9. Migration Plan

### Phase 1: Setup (30 min)
- Create new Next.js project
- Copy UI components from v5 (unchanged)
- Copy data loading from v5

### Phase 2: Config (30 min)
- Build config loader from CSV files
- Generate lookup tables programmatically
- No hardcoded maps

### Phase 3: Query Pipeline (2-3 hours)
- Implement tokenizer
- Implement classifier
- Implement resolver
- Implement filter
- Implement scorer
- Implement formatter

### Phase 4: Commands (1-2 hours)
- Port command handlers from v5
- Update to use new pipeline

### Phase 5: Testing (1 hour)
- Run all 30 test cases
- Fix any issues

### Phase 6: Deploy (30 min)
- Push to GitHub
- Deploy to Vercel
- Test with real data

**Total: 5-7 hours**

---

## 10. File Structure

```
financial-chatbot-v6/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # Thin API handler (calls pipeline)
│   ├── page.tsx                  # Chat UI (copied from v5)
│   └── layout.tsx
├── lib/
│   ├── pipeline/
│   │   ├── tokenizer.ts
│   │   ├── classifier.ts
│   │   ├── resolver.ts
│   │   ├── filter.ts
│   │   ├── scorer.ts
│   │   └── formatter.ts
│   ├── config/
│   │   ├── loader.ts
│   │   ├── types.ts
│   │   └── mappings.ts
│   ├── commands/
│   │   ├── analyze.ts
│   │   ├── compare.ts
│   │   ├── trend.ts
│   │   ├── detail.ts
│   │   ├── total.ts
│   │   ├── list.ts
│   │   ├── risk.ts
│   │   └── shortcuts.ts
│   └── data/
│       ├── loader.ts
│       └── types.ts
├── config/                        # CSV config files
│   ├── financial_type_map.csv
│   └── construction_headings_enriched.csv
├── tests/
│   ├── pipeline.test.ts
│   ├── tokenizer.test.ts
│   ├── classifier.test.ts
│   ├── resolver.test.ts
│   └── scorer.test.ts
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md
```

---

## Appendix A: v5 Issue History

| Issue | Date | Description | Root Cause | Fix |
|---|---|---|---|---|
| Issue-5 | 2026-04-10 | 4 original issues (detail, sheet, suggestions, scoring) | Multiple | Structural fixes |
| Issue-6 | 2026-04-10 | Sheet logic not respecting priority | Over-correction from Issue-5 | Reverted to default FS |
| Issue-7 | 2026-04-10 | "committed committed plant" wrong sheet | seenWords dedup | Count occurrences |
| Issue-8 | 2026-04-10 | "accrual accrual material" wrong sheet | Same dedup bug | Same fix |
| Issue-9 | 2026-04-10 | Detail not working, plain "detail" not handled | Cache + regex | Context save + plain handler |
| Issue-10 | 2026-04-10 | budget→Business Plan, "plan"→"plant" | Conflicting maps + partial match | CSV alignment + keyword expansion |

## Appendix B: Config Files Location

- **Financial Type Map:** `G:\My Drive\Ai Chatbot Knowledge Base\Processing\financial_type_map.csv`
- **Heading Map:** `G:\My Drive\Ai Chatbot Knowledge Base\Processing\construction_headings_enriched.csv`
- **Sample Data:** `G:\My Drive\Ai Chatbot Knowledge Base\2026\2\1014 PolyU Financial Report 2026-02_flat_v5.csv`
- **v5 Documentation:** `G:\My Drive\Ai Projects\2026-04-05 New Financial Chatbot\documentation\`

---

*End of Document*
