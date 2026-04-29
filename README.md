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
| 暖炉 | (-3, 0, -3) | 思考・待機・「実行中」の象徴。`landmark: 'fireplace'`。火の粉が立ち上る |
| クエスト掲示板 | (3, 0, 3) | 情報参照・タスクキューの象徴。`landmark: 'quest-board'` |
| ドア | (3, 0, -3) | セッション境界。`landmark: 'door'`、ランダム遷移には含まれない |
| 戦士キャラ | dynamic | エージェント本体。LPC body + arming sword (bg/fg レイヤー) で描画 |
| 頭上ラベル | follow | `{name}: {state}` を表示する canvas テクスチャ |
| ツールバブル | follow | tool 名を 1.8 秒だけ表示する角丸スピーチバブル |
| アクティビティログ | 画面右下 | 直近 10 件の hook イベントを HH:MM:SS 付きで表示 |
| 火の粉 | 暖炉から | 50ms ごとに 1 つ、橙→黄に変化しながらフェードアウト |
| 足元の埃 | 歩行時 | walk frame 1/5 で agent の足元から 1 つ |

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
  | { type: 'goto';      agentId: string; landmark: string }              // 'fireplace' | 'quest-board' | 'door'
  | { type: 'goto-xy';   agentId: string; x: number; z: number }
  | { type: 'idle';      agentId: string; durationMs?: number }
  | { type: 'attack';    agentId: string }
  | { type: 'show-tool'; agentId: string; toolName: string; durationMs?: number }
  | { type: 'spawn';     agentId: string; tint?: [number, number, number] }
  | { type: 'remove';    agentId: string }
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

#### ワンライナー自動インストール

`pag` のディレクトリで:

```bash
npm run install-hook
```

これで `~/.claude/settings.json` に PreToolUse / PostToolUse / SessionStart / Stop / SubagentStop の 5 種フックが追加される。pag リポ内の `scripts/claude-pag-hook.sh` を絶対パスで参照するため、リポを移動した場合は再度 `npm run install-hook` を叩くこと。既存の hook 設定は維持される（pag 由来のエントリは `__pag__: true` マーカーで識別、重複登録はしない）。

削除:

```bash
npm run uninstall-hook
```

サンプル JSON は [examples/.claude-pag-settings.json](./examples/.claude-pag-settings.json) を参照。

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
| `SessionStart` | — | main をドアに瞬間配置 → 中央へ歩く（入場演出） |
| `PreToolUse` | tool=Task | `task-{tool_use_id}` 名で動的 spawn (緑 tint) → fireplace へ |
| `PreToolUse` | tool=Bash/Write/Edit | main に `show-tool` バブル + `attack` (剣を振る) |
| `PreToolUse` | tool=Read/Grep/Glob | main に `show-tool` バブル + `goto quest-board` |
| `PreToolUse` | その他 | main に `show-tool` バブル + `goto fireplace` |
| `PostToolUse` | tool=Task | 該当 `task-*` agent を `remove` |
| `PostToolUse` | その他 | main を `idle` 1.5s |
| `Stop` | — | main を `goto door`（セッション終了演出、ドア到着後は自律 random walk へ） |
| `SubagentStop` | — | `remove sub-{session_id 先頭8桁}`（保険、taskAgents Map とは別経路） |

各 dispatch はアクティビティログ HUD にも色付きで記録される。

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
│   ├── label sprite (always-on, canvas texture, renderOrder 10)
│   ├── bubble sprite (transient tool name, renderOrder 11)
│   ├── state: 'idle' | 'walking' | 'attacking'
│   ├── pickNewTarget()    ← landmark bias (fireplace 50% / board 25% / random 25%)
│   ├── update(now, dtMs)  ← state machine + separation force + bubble auto-hide + dust emit
│   ├── attack() / goto() / setIdle() / showTool()  ← external commands
│   └── finishAttack()
├── Agent.landmarks: { name, position }[]   ← shared registry (fireplace / quest-board / door)
├── Agent.all: Agent[]                      ← shared for separation
├── agents: Agent[]                         ← spawn order
├── taskAgents: Map<tool_use_id, name>      ← Task tool dynamic spawn tracking
├── Particle class + activeParticles + particlePool + emitParticle()
├── pushLog(msg, tag) + #pag-log DOM HUD
├── dispatch(event)         ← AgentEvent → method calls
├── window.pag = { dispatch, list }
├── handleHookEvent(payload) ← maps Claude Code hook payloads to dispatch + pushLog
└── pollHookEvents()         ← /__pag/events fetch loop (every 500ms)

vite.config.ts
└── pagHookBridge plugin
    ├── POST /__pag/event  → in-memory events[]
    └── GET  /__pag/events?since=N → diff

scripts/claude-pag-hook.sh
└── stdin → POST /__pag/event with hook_event_name tag (jq optional)
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
- [x] PreToolUse Task からの動的 subagent spawn / PostToolUse で remove
- [x] ツール名スピーチバブル（PreToolUse のたびに対応 agent 頭上）
- [x] アクティビティログ HUD（画面右下、色付き、HH:MM:SS）
- [x] パーティクル（暖炉の火の粉、歩行時の足元の埃）
- [x] ドア配置 + SessionStart で入場 / Stop でドアへ向かう演出
- [ ] エージェント間対話演出（吹き出しのやりとり、向き合い）
- [ ] 時間帯による光量変化（朝・夕・夜）
- [ ] tool 結果の成功/失敗を視覚化（例: 失敗時の赤いハイライト）

## ライセンス

- **ソースコード** (`src/`, `vite.config.ts`, `scripts/`): 明示的な LICENSE が必要なら別途追加（現状 all rights reserved）
- **アセット** (`public/assets/sprites/`): CC-BY-SA 3.0 — 詳細は [LICENSE](./LICENSE) 全文と [CREDITS.md](./CREDITS.md)

LPC スプライトの継承条件として、本リポジトリの **派生スプライト成果物**は CC-BY-SA 3.0 で頒布される。スプライトを置き換えるか同条件で頒布する限り、コード自体は自由に組み込める。

## 関連リンク

- [Claude Code](https://claude.com/claude-code)
- [Claude Code hooks reference](https://docs.claude.com/en/docs/claude-code/hooks)
- [Liberated Pixel Cup](https://lpc.opengameart.org/)
- [Universal-LPC-Spritesheet-Character-Generator](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator)
