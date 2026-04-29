# Credits / Asset Attribution

このプロジェクトで使用しているサードパーティアセットのクレジットとライセンス。

## Character & Weapon Sprites (LPC: Liberated Pixel Cup)

すべて [LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator) リポジトリ（master ブランチ）から取得。

### Body — Male / Female / Muscular

| ファイル | 元ファイル名 |
| --- | --- |
| `public/assets/sprites/body_male_walk.png` | `spritesheets/body/bodies/male/walk.png` |
| `public/assets/sprites/body_male_idle.png` | `spritesheets/body/bodies/male/idle.png` |
| `public/assets/sprites/body_male_combat_idle.png` | `spritesheets/body/bodies/male/combat_idle.png` |
| `public/assets/sprites/body_male_slash.png` | `spritesheets/body/bodies/male/slash.png` |
| `public/assets/sprites/body_female_walk.png` | `spritesheets/body/bodies/female/walk.png` |
| `public/assets/sprites/body_female_slash.png` | `spritesheets/body/bodies/female/slash.png` |
| `public/assets/sprites/body_muscular_walk.png` | `spritesheets/body/bodies/muscular/walk.png` |
| `public/assets/sprites/body_muscular_slash.png` | `spritesheets/body/bodies/muscular/slash.png` |
| `public/assets/sprites/body_teen_walk.png` | `spritesheets/body/bodies/teen/walk.png` |
| `public/assets/sprites/body_teen_slash.png` | `spritesheets/body/bodies/teen/slash.png` |

### Hair (single-layer styles, adult palette)

| ファイル | 元ファイル名 |
| --- | --- |
| `public/assets/sprites/hair/pigtails_walk.png` | `spritesheets/hair/pigtails/adult/walk.png` |
| `public/assets/sprites/hair/pigtails_slash.png` | `spritesheets/hair/pigtails/adult/slash.png` |
| `public/assets/sprites/hair/long_walk.png` | `spritesheets/hair/long/adult/walk.png` |
| `public/assets/sprites/hair/long_slash.png` | `spritesheets/hair/long/adult/slash.png` |
| `public/assets/sprites/hair/bob_walk.png` | `spritesheets/hair/bob/adult/walk.png` |
| `public/assets/sprites/hair/bob_slash.png` | `spritesheets/hair/bob/adult/slash.png` |
| `public/assets/sprites/hair/bangs_walk.png` | `spritesheets/hair/bangs/adult/walk.png` |
| `public/assets/sprites/hair/bangs_slash.png` | `spritesheets/hair/bangs/adult/slash.png` |

LPC body collection と同じく OGA-BY 3.0 / CC-BY-SA 3.0 / GPL 3.0 のマルチライセンス、本プロジェクトでは CC-BY-SA 3.0 を採用。原作者は LPC コミュニティ（CREDITS.csv 参照）。

- **Authors**: bluecarrot16, JaidynReiman, Benjamin K. Smith (BenCreating), Evert, Eliza Wyatt (ElizaWy), TheraHedwig, MuffinElZangano, Durrani, Johannes Sjölund (wulax), Stephen Challener (Redshrike)
- **Licenses**: OGA-BY 3.0 / CC-BY-SA 3.0 / GPL 3.0（複数ライセンスのいずれかで利用可、本プロジェクトでは **CC-BY-SA 3.0** を選択）
- **Sources**:
  - https://opengameart.org/content/lpc-character-bases
  - https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles
  - https://opengameart.org/content/lpc-medieval-fantasy-character-sprites
  - https://opengameart.org/content/lpc-revised-character-basics
  - https://opengameart.org/content/lpc-runcycle-and-diagonal-walkcycle
  - https://opengameart.org/content/lpc-male-jumping-animation-by-durrani
  - https://opengameart.org/content/lpc-runcycle-for-male-muscular-and-pregnant-character-bases-with-modular-heads
  - https://opengameart.org/content/lpc-jump-expanded
  - https://opengameart.org/content/lpc-be-seated

### Weapon — Arming Sword (Universal palette)

| ファイル | 元ファイル名 |
| --- | --- |
| `public/assets/sprites/weapon/sword_arming_walk_fg.png` | `spritesheets/weapon/sword/arming/universal/walk/fg.png` |
| `public/assets/sprites/weapon/sword_arming_walk_bg.png` | `spritesheets/weapon/sword/arming/universal/walk/bg.png` |
| `public/assets/sprites/weapon/sword_arming_idle_fg.png` | `spritesheets/weapon/sword/arming/universal/idle/fg.png` |
| `public/assets/sprites/weapon/sword_arming_idle_bg.png` | `spritesheets/weapon/sword/arming/universal/idle/bg.png` |

- **Authors**: ElizaWy; walk and down by JaidynReiman
- **License**: OGA-BY 3.0
- **Sources**:
  - https://github.com/ElizaWy/LPC/tree/main/Characters/Props/Sword%2001%20-%20Arming%20Sword
  - https://opengameart.org/content/lpc-expanded-sit-run-jump-more

## License Notes

LPC アセットを採用した時点で、本プロジェクトの**派生著作物（スプライト由来の成果物）は CC-BY-SA 3.0 / GPL 3.0 の継承条件下に置かれる**点に留意。プロジェクトのソースコード自体（`src/` 配下の TypeScript）はスプライトと不可分結合していない限りこの継承の対象外。

CC-BY-SA 3.0 の要件:
1. クレジット表示（本ファイル）
2. ライセンス表記とリンク（https://creativecommons.org/licenses/by-sa/3.0/）
3. 改変した場合はその旨を明記
4. 派生著作物は同一ライセンスで頒布

OGA-BY 3.0 の要件: 著作者表記。商用可、派生 OK、ライセンス継承の強制なし（ただし本リポでは混在のため CC-BY-SA を上位採用）。

## Sprite Sheet Specs (LPC standard)

- 1 セル = 64×64 px
- 行 = 方向（上、左、下、右の順、universal layout）
- 列 = フレーム
- `walk.png`: 9 フレーム × 4 方向（576×256）
- `idle.png` / `combat_idle.png`: 2 フレーム × 4 方向（128×256）
- `slash.png`: 6 フレーム × 4 方向（384×256）
- `fg`（foreground）= キャラより手前のレイヤー、`bg`（background）= キャラより奥のレイヤー
