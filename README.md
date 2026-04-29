# pag

> 2.5D fantasy companion visualizer for Claude Code agents.
> Claude Code エージェントの活動を可視化するビジュアル・コンパニオン。

`pag` は、[Claude Code](https://claude.com/claude-code) で長いタスク（ビルド、長時間生成、リサーチ、テスト走行など）を待っている時間を退屈させないための **可視化レイヤー**。CLI のテキスト出力を眺める代わりに、中世ファンタジー RPG 風の戦士キャラがエージェントの活動を表現する画面を眺めて時間を潰す。

メインエージェントとサブエージェント（Task tool で起動される下位エージェント）はそれぞれ 1 体のキャラとしてシーン上を歩き回り、暖炉（思考/待機）やクエスト掲示板（タスクキュー）を訪問する挙動でエージェントの状態を視覚化する。

## 走らせ方

```bash
git clone https://github.com/tanimurahifukka/pag.git
cd pag
npm install
npm run dev
```

ブラウザで http://localhost:5173/ を開く。

## 操作

**プレイヤー操作はない**。すべて自律 or 外部イベント駆動。デフォルトでは 3 体のエージェント（`main` / `sub-1` / `sub-2`）が暖炉と掲示板を中心にランダムウォークする。

外部から制御するには、ブラウザコンソールまたは外部スクリプトから `window.pag` API を呼ぶ:

```js
// 全エージェント名を取得
window.pag.list()
// → ['main', 'sub-1', 'sub-2']

// main エージェントを暖炉に行かせる
window.pag.dispatch({ type: 'goto', agentId: 'main', landmark: 'fireplace' })

// 任意座標へ歩かせる（床範囲は X/Z 共に [-4, 4]）
window.pag.dispatch({ type: 'goto-xy', agentId: 'sub-1', x: 2, z: -1 })

// 1.5 秒その場で待機
window.pag.dispatch({ type: 'idle', agentId: 'sub-2', durationMs: 1500 })

// 新しいエージェントを生成（任意 RGB tint 指定可）
window.pag.dispatch({ type: 'spawn', agentId: 'sub-3', tint: [0.85, 1.0, 0.85] })

// エージェントを除去
window.pag.dispatch({ type: 'remove', agentId: 'sub-3' })
```

### AgentEvent 型

```ts
type AgentEvent =
  | { type: 'goto'; agentId: string; landmark: string }              // landmark: 'fireplace' | 'quest-board'
  | { type: 'goto-xy'; agentId: string; x: number; z: number }
  | { type: 'idle'; agentId: string; durationMs?: number }
  | { type: 'spawn'; agentId: string; tint?: [number, number, number] }
  | { type: 'remove'; agentId: string }
```

`dispatch()` は overlay 命令として動作する: 命令が来ればその通りに動き、命令が無いか到着後は自律ランダムウォークに戻る。

## シーン要素

| オブジェクト | 位置 | 意味 |
| --- | --- | --- |
| 床 (10×10) | 中心 (0, 0, 0) | 行動範囲、エージェントの目標は床端から 1 単位マージン内 |
| 暖炉 | (-3, 0, -3) | 思考・待機の象徴。`landmark: 'fireplace'` |
| クエスト掲示板 | (3, 0, 3) | タスクキュー・指示受付の象徴。`landmark: 'quest-board'` |
| 戦士キャラ | dynamic | エージェント本体、LPC スプライトで描画 |

## 技術スタック

- **Three.js**: 3D / 2.5D レンダリング、Orthographic camera で擬似アイソメトリック
- **Vite + TypeScript**: ビルド・開発サーバー
- **LPC スプライト**: キャラクター描画、64×64 px / 9 frame walk cycle / 4 方向

## ロードマップ

- [x] Three.js + Vite scaffold（オルソグラフィック 2.5D シーン）
- [x] LPC walking warrior の描画
- [x] 自律ランダムウォーク
- [x] 暖炉・クエスト掲示板の配置
- [x] 複数エージェント (main + subs) 対応
- [x] `window.pag` 外部 API
- [ ] Claude Code [hooks](https://docs.claude.com/en/docs/claude-code/hooks) 経由で実イベントを流し込むブリッジ
- [ ] 思考バブル / 現在の意図テキストをキャラ頭上に表示
- [ ] 石畳タイル床、複数アセット
- [ ] エージェント間インタラクション（衝突回避、対話演出）

## ライセンス

- **ソースコード** (`src/`): MIT 相当（明示的な LICENSE 別ファイルが無い場合は all rights reserved 扱いになるため、必要なら別途追加）
- **アセット** (`public/assets/sprites/`): CC-BY-SA 3.0（[LICENSE](./LICENSE) 全文、[CREDITS.md](./CREDITS.md) で個別作者リスト）

LPC スプライトの継承条件として、本リポジトリの **派生スプライト成果物**は CC-BY-SA 3.0 で頒布される。スプライトを置き換えるか同条件で頒布する限り、コード自体は自由に組み込める。

## 関連リンク

- [Claude Code](https://claude.com/claude-code)
- [Liberated Pixel Cup](https://lpc.opengameart.org/)
- [Universal-LPC-Spritesheet-Character-Generator](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator)
