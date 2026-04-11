export function handleShortcuts(): string {
  return `⚡ **Financial Chatbot v6 — Commands**

**Query Format:**
  \`[financial_type] [data_item]\`  e.g. \`committed plant\`, \`bp gp\`

**Commands:**
| Command | Description |
|---------|-------------|
| \`analyze\` | 6-comparison financial analysis |
| \`compare X vs Y\` | Compare two financial types |
| \`trend [metric] [N]\` | Show values over N months |
| \`list\` | Show tier-1 items |
| \`list more\` | Show tier-2 items |
| \`list 2.2\` | Show children of item 2.2 |
| \`total [item] [type]\` | Sum sub-items under parent |
| \`detail\` | Drill into last result |
| \`detail N\` | Drill into Nth sub-item |
| \`detail 2.1\` | Jump to item 2.1 |
| \`risk\` | Risk items (WIP/Committed/CF) |
| \`cash flow\` | 12-month GP summary |
| \`type\` | List all financial types |
| \`shortcuts\` / \`help\` | Show this help |

**Financial Type Shortcuts:**
  \`bp\` → Business Plan | \`budget\`/\`bt\`/\`rev\` → Latest Budget
  \`wip\`/\`audit\` → WIP | \`committed\` → Committed Cost
  \`cf\`/\`cashflow\` → Cash Flow | \`accrual\` → Accrual
  \`projection\`/\`projected\` → Projection | \`tender\` → Budget Tender

**Data Type Shortcuts:**
  \`gp\` → Gross Profit (3) | \`np\` → Net Profit (7)
  \`cost\` → Total Cost (2) | \`income\` → Total Income (1)
  \`prelim\` → Preliminaries (2.1) | \`plant\` → Plant & Machinery (2.3)
  \`subcon\` → Subcontractor (2.4) | \`labour\` → Direct Labour (2.5)

**Examples:**
  "committed committed plant" → Committed Cost sheet, Plant data
  "bp income" → Business Plan gross income (Financial Status)
  "wip gp" → WIP gross profit
  "trend gp 6" → Gross profit over 6 months`
}

export function handleType(): string {
  return `💰 **Financial Types & Sheet Names**

| Type | Keywords | Sheet |
|------|----------|-------|
| Business Plan | bp, plan | Business Plan |
| Latest Budget | budget, bt, rev, revision | Financial Status |
| Budget Tender | tender | Budget Tender |
| 1st Working Budget | 1wb | 1st Working Budget |
| WIP | wip, audit | WIP |
| Projection | projection, projected | Projection |
| Committed Cost | committed | Committed Cost |
| Accrual | accrual | Accrual |
| Cash Flow | cf, cashflow, cash flow | Cash Flow |

**Sheet Selection Logic:**
• 1 keyword + no month → Financial Status (multi-type snapshot)
• 1 keyword + month → that type's own sheet
• 2+ same keyword → explicit sheet (e.g. "committed committed plant")`
}
