#!/usr/bin/env node
/**
 * Drives pag through a scripted, Claude Code-like session.
 * Requires: npm run dev (Vite on :5173) running in another shell.
 * Run: npm run demo
 */

const PAG_URL = process.env.PAG_URL || 'http://localhost:5173/__pag/event'

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
  // セッション開始 → main がドアから入場
  { wait: 500, payload: { hook_event_name: 'SessionStart' }, label: 'SessionStart' },

  // ファイルを探す
  { wait: 2200, payload: { hook_event_name: 'PreToolUse', tool_name: 'Glob' }, label: 'PreToolUse Glob (find files)' },
  { wait: 1400, payload: { hook_event_name: 'PostToolUse', tool_name: 'Glob' }, label: 'PostToolUse Glob' },

  // 内容を読む
  { wait: 1600, payload: { hook_event_name: 'PreToolUse', tool_name: 'Read' }, label: 'PreToolUse Read (library)' },
  { wait: 1400, payload: { hook_event_name: 'PostToolUse', tool_name: 'Read' }, label: 'PostToolUse Read' },

  // grep で探索
  { wait: 1400, payload: { hook_event_name: 'PreToolUse', tool_name: 'Grep' }, label: 'PreToolUse Grep' },
  { wait: 1200, payload: { hook_event_name: 'PostToolUse', tool_name: 'Grep' }, label: 'PostToolUse Grep' },

  // Bash 実行 → workbench
  { wait: 1800, payload: { hook_event_name: 'PreToolUse', tool_name: 'Bash' }, label: 'PreToolUse Bash (workbench)' },
  { wait: 1800, payload: { hook_event_name: 'PostToolUse', tool_name: 'Bash' }, label: 'PostToolUse Bash' },

  // ファイル編集 → 訓練人形を切る
  { wait: 1600, payload: { hook_event_name: 'PreToolUse', tool_name: 'Write' }, label: 'PreToolUse Write (dummy)' },
  { wait: 1800, payload: { hook_event_name: 'PostToolUse', tool_name: 'Write' }, label: 'PostToolUse Write' },

  { wait: 1400, payload: { hook_event_name: 'PreToolUse', tool_name: 'Edit' }, label: 'PreToolUse Edit (dummy)' },
  { wait: 1800, payload: { hook_event_name: 'PostToolUse', tool_name: 'Edit' }, label: 'PostToolUse Edit' },

  // ツール失敗 → 赤フラッシュ
  { wait: 1600, payload: { hook_event_name: 'PreToolUse', tool_name: 'Bash' }, label: 'PreToolUse Bash (will fail)' },
  {
    wait: 1500,
    payload: { hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_response: { is_error: true, error: 'exit 1' } },
    label: 'PostToolUse Bash FAIL (red flash)',
  },

  // サブエージェント spawn
  {
    wait: 2200,
    payload: { hook_event_name: 'PreToolUse', tool_name: 'Task', tool_use_id: 'demo-task-001' },
    label: 'PreToolUse Task (spawn subagent)',
  },

  // サブエージェント中の活動を演出
  { wait: 2400, payload: { hook_event_name: 'PreToolUse', tool_name: 'Read' }, label: '  (main also reading)' },
  { wait: 1600, payload: { hook_event_name: 'PostToolUse', tool_name: 'Read' }, label: '  PostToolUse Read' },

  // サブエージェント完了
  {
    wait: 2000,
    payload: { hook_event_name: 'PostToolUse', tool_name: 'Task', tool_use_id: 'demo-task-001' },
    label: 'PostToolUse Task (subagent done)',
  },

  // Web 検索 → quest-board
  { wait: 1800, payload: { hook_event_name: 'PreToolUse', tool_name: 'WebSearch' }, label: 'PreToolUse WebSearch (board)' },
  { wait: 2000, payload: { hook_event_name: 'PostToolUse', tool_name: 'WebSearch' }, label: 'PostToolUse WebSearch' },

  // セッション終了 → main がドアへ
  { wait: 2400, payload: { hook_event_name: 'Stop' }, label: 'Stop (session end → door)' },
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
