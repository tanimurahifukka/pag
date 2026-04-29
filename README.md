# pag

> 2.5D fantasy companion visualizer for Claude Code agents.
> Claude Code エージェントの活動を可視化するビジュアル・コンパニオン。

`pag` は、[Claude Code](https://claude.com/claude-code) で長いタスク（ビルド、長時間生成、リサーチ、テスト走行など）を待っている時間を退屈させないための **可視化レイヤー**。CLI のテキスト出力を眺める代わりに、中世ファンタジー RPG 風の戦士キャラがエージェントの活動を表現する画面を眺めて時間を潰す。

メインエージェントとサブエージェント（Task tool で起動される下位エージェント）はそれぞれ 1 体のキャラとしてシーン上を歩き回り、暖炉（思考/待機）やクエスト掲示板（情報参照）を訪問する挙動でエージェントの状態を視覚化する。Claude Code の hook 経由でリアルタイムにキャラを動かせる。

## 走らせ方

```bash
git clone https://github.com/tanimurahifukka/pag.git
cd pag
npm install
npm run dev
```

ブラウザで http://localhost:5173/ を開く。デフォルトで 3 体（`main` / `sub-1` / `sub-2`、それぞれ male / female / muscular の LPC body）が剣を帯びて石畳の上を歩き、暖炉とクエスト掲示板の間を行き来する。

## シーン要素

| オブジェクト | 位置 | 意味 |
| --- | --- | --- |
| 床 (10×10) | 中心 (0, 0, 0) | 石畳タイル（procedural canvas）。エージェント目標は床端から 1 単位マージン内 |
| 暖炉 | (-3, 0, -3) | 思考・待機・「実行中」の象徴。`landmark: 'fireplace'` |
| クエスト掲示板 | (3, 0, 3) | 情報参照・タスクキューの象徴。`landmark: 'quest-board'` |
| 戦士キャラ | dynamic | エージェント本体。LPC body + arming sword (bg/fg レイヤー) で描画 |
| 頭上ラベル | follow | `{name}: {state}` を表示する canvas テクスチャ |

## 操作

**プレイヤー操作はない**。すべて自律 or 外部イベント駆動。

- **自律**: 各 agent は独立した state machine (`idle` / `walking` / `attacking`) で動く。pickNewTarget は 50% 暖炉 / 25% 掲示板 / 25% ランダム
- **外部**: `window.pag` API で個別命令、または Claude Code hooks bridge 経由で自動駆動

### `window.pag` API

ブラウザコンソールまたは外部スクリプトから:

```js
window.pag.list()
// → ['main', 'sub-1', 'sub-2']

window.pag.dispatch({ type: 'goto',    agentId: 'main',  landmark: 'fireplace' })
window.pag.dispatch({ type: 'goto-xy', agentId: 'sub-1', x: 2, z: -1 })
window.pag.dispatch({ type: 'idle',    agentId: 'sub-2', durationMs: 1500 })
window.pag.dispatch({ type: 'attack',  agentId: 'main' })   // slash 6 frames
window.pag.dispatch({ type: 'spawn',   agentId: 'sub-3', tint: [0.85, 1.0, 0.85] })
window.pag.dispatch({ type: 'remove',  agentId: 'sub-3' })
```

### AgentEvent 型

```ts
type AgentEvent =
  | { type: 'goto';    agentId: string; landmark: string }              // 'fireplace' | 'quest-board'
  | { type: 'goto-xy'; agentId: string; x: number; z: number }
  | { type: 'idle';    agentId: string; durationMs?: number }
  | { type: 'attack';  agentId: string }
  | { type: 'spawn';   agentId: string; tint?: [number, number, number] }
  | { type: 'remove';  agentId: string }
```

`dispatch()` は overlay 命令として動作する。命令が来ればその通りに動き、命令が無いか到着後は自律ランダムウォークに戻る。`attack` は slash アニメ完走後、強制的に idle に遷移。

## Claude Code hooks 連携

`pag` の dev サーバ (Vite) 自体に hook bridge エンドポイントが組み込まれているので、別プロセスは不要。

### 仕組み

```
Claude Code
   │
   ├─ PreToolUse / PostToolUse / Stop / SubagentStop hook
   │   ├─ stdin: event JSON ({hook_event_name, tool_name, ...})
   │   └─ shell exec: scripts/claude-pag-hook.sh <hook_name>
   │       └─ POST http://localhost:5173/__pag/event
   │
Vite middleware (vite.config.ts)
   │   ├─ POST /__pag/event   ─→ 内部キューに蓄積
   │   └─ GET  /__pag/events  ─→ since=N で差分返却
   │
Browser (src/main.ts)
   └─ 500ms 周期で fetch /__pag/events?since=N
       └─ payload を AgentEvent に変換 → window.pag.dispatch()
```

### Claude Code 側 (`~/.claude/settings.json`) のサンプル

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "/path/to/pag/scripts/claude-pag-hook.sh PreToolUse"
      }]
    }],
    "PostToolUse": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "/path/to/pag/scripts/claude-pag-hook.sh PostToolUse"
      }]
    }],
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "/path/to/pag/scripts/claude-pag-hook.sh Stop"
      }]
    }]
  }
}
```

`scripts/claude-pag-hook.sh` は失敗を握りつぶすので、`pag` が起動していなくても Claude Code 本体には影響しない。

### イベントマッピング（`src/main.ts handleHookEvent`）

| Claude Code event | 条件 | pag dispatch |
| --- | --- | --- |
| `PreToolUse` | tool=Bash/Write/Edit | `attack` (剣を振る) |
| `PreToolUse` | tool=Read/Grep/Glob | `goto quest-board` (情報参照) |
| `PreToolUse` | その他 | `goto fireplace` (思考中) |
| `PostToolUse` / `Stop` | — | `idle` 1.5s |
| `SubagentStop` | — | `remove sub-{session_id 先頭8桁}` |

`src/main.ts` の `handleHookEvent` を書き換えれば自由にマッピング変更可能。

### イベントを手動でテスト

```bash
echo '{"hook_event_name":"PreToolUse","tool_name":"Bash"}' \
  | curl -X POST -H 'Content-Type: application/json' \
         -d @- http://localhost:5173/__pag/event
```

→ ブラウザの `main` キャラが剣を振る。

## 技術スタック

- **Three.js (r188+)**: 3D/2.5D レンダリング、Orthographic camera で擬似アイソメトリック
- **Vite 8 + TypeScript**: ビルド・開発サーバー、middleware で hook bridge を内蔵
- **LPC スプライト**: 64×64 px / 9 frame walk / 6 frame slash / 4 方向、3 種の body (male/female/muscular) と arming sword の bg+fg レイヤー
- **Procedural cobblestone**: canvas 生成のシード固定石畳テクスチャ

## アーキテクチャ概観

```
src/main.ts
├── Agent class
│   ├── body sprite + bodyTex (walk sheet)
│   ├── slashTex (attack sheet, on demand)
│   ├── swordBg / swordFg sprites (renderOrder 0 / 2)
│   ├── label sprite (canvas texture, renderOrder 10)
│   ├── state: 'idle' | 'walking' | 'attacking'
│   ├── pickNewTarget()  ← bias toward landmarks
│   ├── update(now, dtMs) ← state machine + separation force
│   └── attack() / goto() / setIdle()  ← external commands
├── Agent.landmarks: { name, position }[]   ← shared registry
├── Agent.all: Agent[]                      ← shared for separation
├── agents: Agent[]                         ← spawn order
├── dispatch(event)                         ← AgentEvent → method calls
├── window.pag = { dispatch, list }
└── pollHookEvents()                        ← /__pag/events → dispatch

vite.config.ts
└── pagHookBridge plugin
    ├── POST /__pag/event  → in-memory events[]
    └── GET  /__pag/events?since=N → diff

scripts/claude-pag-hook.sh
└── stdin → POST /__pag/event with hook_event_name tag
```

## ロードマップ

- [x] Three.js + Vite scaffold（オルソグラフィック 2.5D シーン）
- [x] LPC walking warrior の描画
- [x] 自律ランダムウォーク
- [x] 暖炉・クエスト掲示板の配置
- [x] 複数エージェント (main + subs)
- [x] `window.pag` 外部 API
- [x] 思考バブル / 現在の意図テキストをキャラ頭上に表示
- [x] 石畳タイル床（procedural）
- [x] エージェント間衝突回避（separation force）
- [x] 戦士化（arming sword bg/fg overlay）
- [x] 複数 body スプライト（male/female/muscular で識別）
- [x] attack 状態と slash アニメーション
- [x] Claude Code hooks bridge（Vite middleware + shell script + client poll）
- [ ] subagent イベントから動的 spawn（現在は remove のみマッピング）
- [ ] エージェント間対話演出（吹き出し、向き合い）
- [ ] パーティクル（暖炉の煙、足元の埃）
- [ ] 時間帯による光量変化（朝・夕・夜）

## ライセンス

- **ソースコード** (`src/`, `vite.config.ts`, `scripts/`): 明示的な LICENSE が必要なら別途追加（現状 all rights reserved）
- **アセット** (`public/assets/sprites/`): CC-BY-SA 3.0 — 詳細は [LICENSE](./LICENSE) 全文と [CREDITS.md](./CREDITS.md)

LPC スプライトの継承条件として、本リポジトリの **派生スプライト成果物**は CC-BY-SA 3.0 で頒布される。スプライトを置き換えるか同条件で頒布する限り、コード自体は自由に組み込める。

## 関連リンク

- [Claude Code](https://claude.com/claude-code)
- [Claude Code hooks reference](https://docs.claude.com/en/docs/claude-code/hooks)
- [Liberated Pixel Cup](https://lpc.opengameart.org/)
- [Universal-LPC-Spritesheet-Character-Generator](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator)
