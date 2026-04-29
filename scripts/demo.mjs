#!/usr/bin/env node
/**
 * Drives pag through a scripted, Claude Code-like session.
 * Requires: npm run dev (Vite on :5173) running in another shell.
 * Run: npm run demo
 */

const PAG_URL = process.env.PAG_URL || 'http://localhost:5173/__pag/event'
const SID = 'demo-session-' + Date.now().toString(36)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function send(payload, label) {
  const t = new Date().toISOString().slice(11, 19)
  process.stdout.write(`[${t}] → ${label}\n`)
  try {
    const res = await fetch(PAG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      process.stderr.write(`[${t}] ✗ HTTP ${res.status}\n`)
    }
  } catch (e) {
    process.stderr.write(`[${t}] ✗ ${e.message}\n`)
    process.stderr.write('  Hint: is `npm run dev` running on http://localhost:5173/ ?\n')
    process.exit(1)
  }
}

const SCRIPT = [
  // セッション開始 → party がドアから入場
  { wait: 500, payload: { hook_event_name: 'SessionStart', session_id: SID }, label: 'SessionStart' },

  // ファイルを探す
  {
    wait: 2200,
    payload: { hook_event_name: 'PreToolUse', tool_name: 'Glob', session_id: SID },
    label: 'PreToolUse Glob (find files)',
  },
  {
    wait: 1400,
    payload: { hook_event_name: 'PostToolUse', tool_name: 'Glob', session_id: SID },
    label: 'PostToolUse Glob',
  },

  // 内容を読む
  {
    wait: 1600,
    payload: { hook_event_name: 'PreToolUse', tool_name: 'Read', session_id: SID },
    label: 'PreToolUse Read (library)',
  },
  {
    wait: 1400,
    payload: { hook_event_name: 'PostToolUse', tool_name: 'Read', session_id: SID },
    label: 'PostToolUse Read',
  },

  // grep で探索
  {
    wait: 1400,
    payload: { hook_event_name: 'PreToolUse', tool_name: 'Grep', session_id: SID },
    label: 'PreToolUse Grep',
  },
  {
    wait: 1200,
    payload: { hook_event_name: 'PostToolUse', tool_name: 'Grep', session_id: SID },
    label: 'PostToolUse Grep',
  },

  // Bash 実行 → workbench
  {
    wait: 1800,
    payload: { hook_event_name: 'PreToolUse', tool_name: 'Bash', session_id: SID },
    label: 'PreToolUse Bash (workbench)',
  },
  {
    wait: 1800,
    payload: { hook_event_name: 'PostToolUse', tool_name: 'Bash', session_id: SID },
    label: 'PostToolUse Bash',
  },

  // ファイル編集 → 訓練人形を切る
  {
    wait: 1600,
    payload: { hook_event_name: 'PreToolUse', tool_name: 'Write', session_id: SID },
    label: 'PreToolUse Write (dummy)',
  },
  {
    wait: 1800,
    payload: { hook_event_name: 'PostToolUse', tool_name: 'Write', session_id: SID },
    label: 'PostToolUse Write',
  },

  {
    wait: 1400,
    payload: { hook_event_name: 'PreToolUse', tool_name: 'Edit', session_id: SID },
    label: 'PreToolUse Edit (dummy)',
  },
  {
    wait: 1800,
    payload: { hook_event_name: 'PostToolUse', tool_name: 'Edit', session_id: SID },
    label: 'PostToolUse Edit',
  },

  // ツール失敗イベント
  {
    wait: 1600,
    payload: { hook_event_name: 'PreToolUse', tool_name: 'Bash', session_id: SID },
    label: 'PreToolUse Bash (will fail)',
  },
  {
    wait: 1500,
    payload: {
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_response: { is_error: true, error: 'exit 1' },
      session_id: SID,
    },
    label: 'PostToolUse Bash FAIL',
  },

  // サブエージェント spawn
  {
    wait: 2200,
    payload: { hook_event_name: 'PreToolUse', tool_name: 'Task', tool_use_id: 'demo-task-001', session_id: SID },
    label: 'PreToolUse Task (spawn subagent)',
  },

  // サブエージェント中の活動を演出
  {
    wait: 2400,
    payload: { hook_event_name: 'PreToolUse', tool_name: 'Read', session_id: SID },
    label: '  (main also reading)',
  },
  {
    wait: 1600,
    payload: { hook_event_name: 'PostToolUse', tool_name: 'Read', session_id: SID },
    label: '  PostToolUse Read',
  },

  // サブエージェント完了
  {
    wait: 2000,
    payload: { hook_event_name: 'PostToolUse', tool_name: 'Task', tool_use_id: 'demo-task-001', session_id: SID },
    label: 'PostToolUse Task (subagent done)',
  },

  // Web 検索 → quest-board
  {
    wait: 1800,
    payload: { hook_event_name: 'PreToolUse', tool_name: 'WebSearch', session_id: SID },
    label: 'PreToolUse WebSearch (board)',
  },
  {
    wait: 2000,
    payload: { hook_event_name: 'PostToolUse', tool_name: 'WebSearch', session_id: SID },
    label: 'PostToolUse WebSearch',
  },

  // セッション終了 → party がドアへ
  { wait: 2400, payload: { hook_event_name: 'Stop', session_id: SID }, label: 'Stop (session end → door)' },
]

async function main() {
  process.stdout.write(`pag demo → POST events to ${PAG_URL}\n`)
  process.stdout.write(`(make sure \`npm run dev\` is running)\n\n`)

  for (const step of SCRIPT) {
    await sleep(step.wait)
    await send(step.payload, step.label)
  }

  process.stdout.write('\n✓ demo complete\n')
}

main()
