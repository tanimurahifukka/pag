#!/usr/bin/env node
/**
 * Idempotently merges pag's hook entries into ~/.claude/settings.json.
 * Safe to run multiple times. Existing hooks from other tools are preserved.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json')
const SCRIPT_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'claude-pag-hook.sh',
)

const PAG_MARKER = '__pag__'   // pag が入れた entry の判別用キー

function makeHook(eventName) {
  return {
    type: 'command',
    command: `${SCRIPT_PATH} ${eventName}`,
    [PAG_MARKER]: true,
  }
}

function ensureMatcherEntry(eventArr, matcher = '*') {
  // 既存 entry の中に pag のものが含まれている matcher を探し、無ければ作る
  let entry = eventArr.find((e) => e.matcher === matcher)
  if (!entry) {
    entry = { matcher, hooks: [] }
    eventArr.push(entry)
  }
  if (!Array.isArray(entry.hooks)) entry.hooks = []
  return entry
}

function dedupeHooks(hooks, eventName) {
  // 既存に pag マーカー付きが居れば command を更新、無ければ追加
  const idx = hooks.findIndex((h) => h && h[PAG_MARKER] === true)
  if (idx >= 0) {
    hooks[idx] = makeHook(eventName)
  } else {
    hooks.push(makeHook(eventName))
  }
}

function main() {
  let settings = {}
  if (fs.existsSync(SETTINGS_PATH)) {
    try {
      settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'))
    } catch (e) {
      console.error('Failed to parse', SETTINGS_PATH, e.message)
      process.exit(1)
    }
  }

  if (!settings.hooks || typeof settings.hooks !== 'object') settings.hooks = {}

  // PreToolUse / PostToolUse use matcher; SessionStart / Stop / SubagentStop are flat lists in current Claude Code spec
  for (const eventName of ['PreToolUse', 'PostToolUse']) {
    if (!Array.isArray(settings.hooks[eventName])) settings.hooks[eventName] = []
    const entry = ensureMatcherEntry(settings.hooks[eventName], '*')
    dedupeHooks(entry.hooks, eventName)
  }

  for (const eventName of ['SessionStart', 'Stop', 'SubagentStop']) {
    if (!Array.isArray(settings.hooks[eventName])) settings.hooks[eventName] = []
    const entry = ensureMatcherEntry(settings.hooks[eventName], '*')
    dedupeHooks(entry.hooks, eventName)
  }

  // 親ディレクトリ確認
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true })

  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n')
  console.log('✓ pag hooks installed at', SETTINGS_PATH)
  console.log('✓ hook script:', SCRIPT_PATH)
  console.log('  Run `npm run dev` in pag, then any Claude Code session will drive the visualizer.')
}

main()
