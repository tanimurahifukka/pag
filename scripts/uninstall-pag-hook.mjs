#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json')
const PAG_MARKER = '__pag__'

function pruneEvent(eventArr) {
  if (!Array.isArray(eventArr)) return eventArr
  for (const entry of eventArr) {
    if (Array.isArray(entry.hooks)) {
      entry.hooks = entry.hooks.filter((h) => !(h && h[PAG_MARKER] === true))
    }
  }
  return eventArr.filter((e) => !Array.isArray(e.hooks) || e.hooks.length > 0)
}

function main() {
  if (!fs.existsSync(SETTINGS_PATH)) {
    console.log('No settings.json at', SETTINGS_PATH, '— nothing to uninstall.')
    return
  }
  const raw = fs.readFileSync(SETTINGS_PATH, 'utf8')
  const settings = JSON.parse(raw)
  if (!settings.hooks) {
    console.log('No hooks block in settings.json — nothing to uninstall.')
    return
  }
  for (const k of Object.keys(settings.hooks)) {
    settings.hooks[k] = pruneEvent(settings.hooks[k])
    if (Array.isArray(settings.hooks[k]) && settings.hooks[k].length === 0) {
      delete settings.hooks[k]
    }
  }
  if (Object.keys(settings.hooks).length === 0) delete settings.hooks
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n')
  console.log('✓ pag hooks removed from', SETTINGS_PATH)
}

main()
