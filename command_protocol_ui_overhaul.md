# command_protocol_ui_overhaul.md — 食/旬検定 UI大改良指示書

> **ゲートモード: Mastery**（1ステップ完了→報告→次のステップ）
> **目的**: AIリテラシー検定の「色違いコピー」から脱却し、**食の世界観を持った別作品**にする
> **原則**: エンジン（ゲームロジック・状態管理・音）は触らない。見た目・テキスト・データだけ変える
> **設計元**: Second Brain `01_プロジェクト/お悩み解決サイト選手権/作品2_食旬検定_メンター会議ブラッシュアップ.md`

---

## Phase 1: バグ修正（5分）

### 1-A. レーダーチャートのラベル切れ修正

**問題**: 左下の「品種のひみつ」の「品」がCanvas左端で切れている。

**対応1 — ラベル名を短縮**（推奨・根本解決）:

`app.js` の `DOMAINS` 定数を以下に変更:

```javascript
const DOMAINS = [
    { key: 'season',     label: '旬' },
    { key: 'megiki',     label: '目利き' },
    { key: 'hozon',      label: '保存' },
    { key: 'tabegoro',   label: '食べ方' },
    { key: 'hinshu',     label: '品種' },
    { key: 'tsukaikiri', label: '使い切り' },
];
```

V3のラベル（つくる/まもる/とどける…）と同じ2〜3文字に揃える。

**対応2 — textAlignの動的切り替え**（併用推奨）:

`drawRadar()` のラベル描画部分（L218〜L235付近）を修正:

```javascript
// labels
ctx.font = '500 11px "Zen Kaku Gothic New", sans-serif';
ctx.textBaseline = 'middle';
DOMAINS.forEach((d, i) => {
    const a = startAngle + angleStep * i;
    const lr = R + 22;
    let x = cx + lr * Math.cos(a);
    let y = cy + lr * Math.sin(a);
    const s = domainStats[d.key];
    const pct = s.total > 0 ? Math.round(s.correct / s.total * 100) : 0;
    
    // 左半分のラベルは右寄せ、右半分は左寄せ、上下は中央
    const cosA = Math.cos(a);
    if (cosA < -0.1) {
        ctx.textAlign = 'right';
    } else if (cosA > 0.1) {
        ctx.textAlign = 'left';
    } else {
        ctx.textAlign = 'center';
    }
    
    ctx.fillStyle = textColor;
    ctx.fillText(d.label, x, y - 7);
    ctx.fillStyle = dimColor;
    ctx.font = '600 10px "Outfit", monospace';
    ctx.fillText(pct + '%', x, y + 7);
    ctx.font = '500 11px "Zen Kaku Gothic New", sans-serif';
});
```

**対応1と対応2の両方を適用すること。**

### 1-B. DOMAIN_HINTS, FOOD_TYPES, WEAKNESS_ADVICE のラベルも同期

`DOMAIN_HINTS` のキーは key ベースなので変更不要。
ただし結果画面で「あなたの弱点は『品種のひみつ』」のように長い表示名を使っている箇所があれば、`DOMAINS` の `label` 参照に揃える。

- [ ] Phase 1 完了

---

## Phase 2: フォント・カラー・世界観の刷新（スタート画面〜ゲーム画面）

### 2-A. Google Fonts に丸ゴシックを追加

`index.html` の `<link>` タグを変更:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;700;800&family=Zen+Maru+Gothic:wght@400;500;700;900&display=swap" rel="stylesheet">
```

**「Zen Kaku Gothic New」→「Zen Maru Gothic」に変更**。丸ゴシック＝食の柔らかさ・温かみ。

`style.css` と `app.js` の全ての `Zen Kaku Gothic New` を `Zen Maru Gothic` に置換する。

### 2-B. CSS変数の色調変更（暖色・食テーマ）

`style.css` の `:root` テーマ変数を以下に差し替え:

```css
/* ダーク既定 → ライト既定に変更 */
:root,
:root[data-theme="light"] {
    --bg:            #faf7f2;      /* クリーム・ナチュラル */
    --bg-elev:       #ffffff;
    --bg-inset:      #f3efe6;      /* 木目・自然な温もり */
    --bg-card:       #f0ebe1;
    --text:          #3d3226;      /* 深いこげ茶 */
    --text-dim:      #8a7e6e;
    --border:        rgba(61, 50, 38, .10);
    --border-strong: rgba(61, 50, 38, .20);
    --accent:        #d4702a;      /* 柿色・収穫のオレンジ */
    --accent-soft:   rgba(212, 112, 42, .10);
    --on-accent:     #ffffff;
    --good:          #5a9e6f;      /* 葉っぱのグリーン */
    --good-soft:     rgba(90, 158, 111, .10);
    --bad:           #c75f4e;      /* 完熟の赤 */
    --bad-soft:      rgba(199, 95, 78, .10);
    --combo:         #b8892e;      /* 蜂蜜のゴールド */
    --glow:          rgba(212, 112, 42, .06);
    --shadow:        0 14px 40px rgba(61, 50, 38, .10);
    --shadow-sm:     0 4px 14px rgba(61, 50, 38, .06);
}

:root[data-theme="dark"] {
    --bg:            #1a1510;      /* 土の色・ダーク */
    --bg-elev:       #231e17;
    --bg-inset:      #1e1913;
    --bg-card:       #2a2318;
    --text:          #f0e8d8;      /* 和紙のクリーム */
    --text-dim:      #a89880;
    --border:        rgba(240, 232, 216, .08);
    --border-strong: rgba(240, 232, 216, .16);
    --accent:        #e8944a;      /* 明るい柿色 */
    --accent-soft:   rgba(232, 148, 74, .12);
    --on-accent:     #1a1510;
    --good:          #6ab87f;
    --good-soft:     rgba(106, 184, 127, .12);
    --bad:           #d98072;
    --bad-soft:      rgba(217, 128, 114, .12);
    --combo:         #e3b774;
    --glow:          rgba(232, 148, 74, .08);
    --shadow:        0 14px 44px rgba(0, 0, 0, .45);
    --shadow-sm:     0 4px 16px rgba(0, 0, 0, .35);
}
```

**重要**: **ライトモードを既定にする**。食は明るく温かい印象がベース。
`index.html` の `<html>` タグまたは JS の初期化で `data-theme="light"` をデフォルトにする。
テーマ切替ボタンは残す（ダークでも使える）。

### 2-C. スタイルシートの先頭コメント変更

```css
/* ===================================
   食の目利き検定 — スタイルシート
   ナチュラル・暖色 / ライト/ダーク両対応
=================================== */
```

### 2-D. スタート画面のビジュアル改良

`index.html` のスタート画面 `#start-screen` を以下のように改修:

```html
<section id="start-screen" class="active">
    <header>
        <div class="subtitle">🌱 農家の検定シリーズ</div>
        <h1>食の目利き検定</h1>
        <p class="start-fruits">🍑🫐🍇🍎🍈🥑</p>
    </header>

    <main class="menu-box">
        <div class="hero">
            <p class="hero-hook">
                <strong>「この果物、いつが旬？」</strong><br>
                <strong>「美味しい見分け方は？」</strong>
            </p>
            <p class="hero-sub">いちじく・桃農家もくもくが出す18問で<br>あなたの<strong>食リテラシー偏差値</strong>を測ります。</p>
        </div>

        <button id="btn-start" class="btn-primary">🍑 検定スタート（60秒）</button>
        <p class="keyboard-hint">
            <kbd>Space</kbd> または <kbd>Enter</kbd> でスタート
        </p>

        <p class="hero-trust">🐑 くだもの農家が畑の合間に作りました ／ ブラウザ完結・データ送信なし</p>

        <details class="how-details">
            <summary>どんなゲーム？ ／ 6つの食リテラシーとは</summary>
            <div class="how-body">
                <ul>
                    <li>いちじく・桃農家が出題する2択クイズ（全18問・制限60秒）</li>
                    <li>食の常識が "正しい" か "ちがう" かを ← → で仕分け</li>
                    <li>結果で6つの食リテラシー（旬・目利き・保存・食べ方・品種・使い切り）をレーダー化し、弱点を名指し</li>
                    <li>あなたの「食タイプ」と農家からのアドバイスも！</li>
                </ul>
            </div>
        </details>
    </main>

    <footer>
        <p>© 2026 まほらまプロジェクト / お悩み解決サイト選手権 応募作品</p>
    </footer>
</section>
```

### 2-E. スタート画面の追加CSS

```css
.start-fruits {
    font-size: 2rem;
    letter-spacing: 0.3em;
    margin: 0.5rem 0 0;
    animation: gentle-bounce 3s ease-in-out infinite;
}

@keyframes gentle-bounce {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-6px); }
}
```

### 2-F. ゲーム画面のカテゴリ表示強化

現在の `#q-category` は小さいテキスト。**食材の絵文字を大きく表示**して食検定であることを視覚的に訴求する。

```css
.q-category {
    font-size: 1.4rem;    /* 現在の約2倍に */
    font-weight: 700;
    margin-bottom: 0.4rem;
    letter-spacing: 0.05em;
}
```

### 2-G. 動作確認

- [ ] ライトモードがデフォルトで表示される
- [ ] 暖色（クリーム/こげ茶/柿色）のカラーテーマが適用されている
- [ ] フォントが丸ゴシック（Zen Maru Gothic）に変わっている
- [ ] スタート画面に果物絵文字と「農家の検定シリーズ」が表示される
- [ ] ダークモード切替も正常に動作する
- [ ] ゲーム画面でカテゴリ（🍑 桃 等）が大きく表示される

- [ ] Phase 2 完了

---

## Phase 3: 結果画面＋PNGカードの改良（ナチュラル感）

> **コンセプト**: AIリテラシー検定のPNGカードは「テック・クール・ダーク」。食検定のカードは**「ナチュラル・温かみ・手触り」**で視覚的に別物にする。同じCanvasロジックでも、色と質感だけで印象が180度変わる。

### 3-A. PNGカードの世界観を「ナチュラル・農園風」に

`app.js` の PNGカード描画関数（`generateResultCard` または該当関数）で:

1. **背景**: ダークのテック感→ **和紙・クリーム系の暖色グラデーション**
   - ライト時: 上 `#faf7f2` → 下 `#f0ebe1`（和紙のクリーム→ベージュ）
   - ダーク時: 上 `#2a2318` → 下 `#1a1510`（土のダーク→深い茶）
2. **カードの角**: 現在の角丸をそのまま使うが、**カード外周に淡い破線or手描き風ボーダー**（`setLineDash([4, 4])` 等）でナチュラル感を出す
3. **食タイプ名をPNGカード上で大きく表示**（偏差値の下、レーダーの上）
4. **農家の検定シリーズ署名を目立つ位置に**: カード下部に `「🌱 農家の検定シリーズ — いちじく・桃農家もくもく」` を追加
5. **カードタイトル横にも果物絵文字**: `🍑 食の目利き検定` として描画
6. **レーダーチャートの塗り色**: AIリテラシー検定の青系→ **`--accent`（柿色オレンジ）系のグラデーション**に。ポリゴン塗りを `rgba(212, 112, 42, 0.25)` のような暖色に
7. **ティアカード（金/銀/銅/紙）の色名**: そのままでOKだが、ティアのグラデーション背景を暖色系（金→蜂蜜、銀→薄桃、銅→赤土、紙→和紙白）に調整

### 3-B. PNGカード描画の具体的変更箇所

PNGカードを描画している関数を探し（`saveResultCard` や `drawResultCard` 等の名前の関数）、以下を変更:

- カードタイトル描画行: `'食の目利き検定'` → `'🍑 食の目利き検定'`
- 偏差値描画の下に食タイプ描画を追加:
  ```javascript
  // 食タイプ描画
  const foodType = determineFoodType(domainStats);
  cardCtx.font = '700 22px "Zen Maru Gothic", sans-serif';
  cardCtx.fillText(foodType.emoji + ' ' + foodType.name, cardW / 2, /* 偏差値の下Y座標 */);
  cardCtx.font = '400 14px "Zen Maru Gothic", sans-serif';
  cardCtx.fillText(foodType.message, cardW / 2, /* さらに下Y座標 */);
  ```
- カード最下部のクレジット行にシリーズ署名を追加:
  ```javascript
  cardCtx.fillText('🌱 農家の検定シリーズ — いちじく・桃農家もくもく', cardW / 2, /* 下部Y座標 */);
  ```

### 3-C. Xシェアテキストの更新

app.js 内のシェアテキスト生成部分を以下に変更:

```javascript
const shareText = `食リテラシー偏差値${deviation}！\nタイプは「${foodType.emoji} ${foodType.name}」\n弱点は「${weakness}」🍑\n\nあなたの食の目利き力は？👇\n${location.href}\n#食の目利き検定 #お悩み解決サイト選手権`;
```

### 3-D. 仕分けログのUI改良

結果画面下部の「📝 今回の仕分けログ」セクション（`.review-box`）を改良:

1. **正解/不正解の視覚的差別化を強化**: 
   - 正解カード: 左ボーダーを `--good`（葉っぱのグリーン）に。背景を `--good-soft` に
   - 不正解カード: 左ボーダーを `--bad`（完熟の赤）に。背景を `--bad-soft` に
   - ボーダー幅を `3px` → `4px` に太くして視認性UP

2. **解説テキストに農家アイコンを付与**:
   - 解説文の先頭に `🍑` を付ける（農家の声であることを視覚的に示す）
   - フォントサイズを少し大きく（`0.82rem` → `0.88rem`）して読みやすく

3. **カテゴリ（🍑 桃 等）を仕分けログ各カードの上部にも表示**:
   - 問題文の上にカテゴリをバッジ風で小さく表示
   - 何の食材の問題だったか一目で分かるように

### 3-E. 動作確認

- [ ] 結果画面の色がライトモードで暖色（クリーム系）になっている
- [ ] PNGカードに食タイプ名が大きく表示される
- [ ] PNGカードに「🌱 農家の検定シリーズ — いちじく・桃農家もくもく」署名がある
- [ ] カードタイトルに🍑が付いている
- [ ] Xシェアテキストにタイプ名が含まれる
- [ ] PNGカードを保存して暖色トーンで美しいか目視確認

- [ ] Phase 3 完了

---

## Phase 4: 問題プール拡大（18問→60〜80問）

### 4-A. 設計方針

- **出題数は18問のまま**（ゲームバランスを維持）
- **プールを60〜80問に拡大**し、毎回ランダムで18問抽出（リプレイ性UP）
- 各ドメインに均等配分（10〜13問 × 6ドメイン）
- `pickQuestions()` はV3と同じロジックで対応可能（6ドメイン×3問＝18問をランダム抽出）

### 4-B. 問題の追加方法

**会議室（Second Brain）が問題ファクトリーで追加問題を生成し、`questions/食材.json` に追記する。**
現場は問題データの形式が正しいことだけ確認すればよい。

追加問題のJSONスキーマ（既存と同じ）:
```json
{
  "id": "shun-019",
  "domain": "season | megiki | hozon | tabegoro | hinshu | tsukaikiri",
  "category": "🍑 桃",
  "text": "○○は△△である。",
  "correct": "good | bad",
  "explanation": "農家もくもくの解説（畑のひとことトーン）",
  "difficulty": 1 | 2
}
```

IDは `shun-019` 〜 `shun-080` で連番。

### 4-C. pickQuestions() の確認

現在のコードは `total = 18` で6ドメイン均等抽出。プールが増えても**変更不要**。
念のためプールが十分大きい場合の動作を確認:
- 各ドメインに3問以上あれば、ランダムで3問ずつ選ばれる
- 不足ドメインは補充ロジックで対応される

### 4-D. 動作確認

- [ ] `食材.json` に60問以上のデータが入っている
- [ ] ゲームを3回プレイして、毎回異なる問題セットが出題される
- [ ] 6ドメインすべてがレーダーチャートに表示される
- [ ] 解説が全問に表示される

- [ ] Phase 4 完了

---

## Phase 5: 最終テスト＋再デプロイ

### 5-A. テスト項目

- [ ] PC Chrome: ライトモードで全画面確認（スタート→ゲーム→結果）
- [ ] ダークモード切替して同様に確認
- [ ] スマホ（タッチ操作）: 左右タップで回答、カード保存
- [ ] キーボードナビ: ←→で回答、Enter/Spaceでスタート、Escで中断
- [ ] BGM・SE・ホイッスルが鳴る
- [ ] コーチマークが表示・消去される
- [ ] レーダーチャートの全ラベルが切れずに表示される（「品種」等）
- [ ] 食タイプが正しく表示される
- [ ] PNGカードを保存して暖色トーン＋シリーズ署名＋食タイプが含まれるか
- [ ] Xシェアテキストにタイプ名と弱点が含まれるか
- [ ] 3回プレイして問題が毎回変わるか（プール拡大後）
- [ ] 作者タブのシリーズリンクが機能するか

### 5-B. Netlify 再デプロイ

```bash
netlify deploy --prod --dir .
```

- [ ] Phase 5 完了

---

## 優先順位（上から順に実行）

| Phase | 内容 | 工数 |
|:--:|---|:--:|
| **1** | バグ修正（ラベル短縮＋textAlign） | 5分 |
| **2** | フォント・カラー・世界観（丸ゴシック＋暖色＋果物ビジュアル） | 2〜3h |
| **3** | PNGカード改良（暖色＋食タイプ目立たせ＋シリーズ署名） | 1〜2h |
| **4** | 問題プール拡大（60〜80問）← 問題データは会議室が別途提供 | 30分（差し替えのみ） |
| **5** | 最終テスト＋再デプロイ | 30分 |

> **全Phase完了条件**: Phase 5 のテスト全項目が ✅ で、Netlify に再デプロイされていること。
