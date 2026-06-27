# todo_protocol.md — 食/旬検定（実装指示書）

> **ゲートモード: Mastery**（1ステップ完了→報告→次のステップ）
> **設計元**: Second Brain `01_プロジェクト/お悩み解決サイト選手権/作品2_食旬検定_設計ドラフト.md`
> **エンジン流用元**: `C:\Deb\website\20260624_ai-literacy-v3`（V3）
> **締切**: 2026-06-30 23:59

---

## Step 0: V3エンジンのコピー

**目的**: V3のファイルを本フォルダにコピーし、動作確認する。

1. 以下のファイルを V3 (`C:\Deb\website\20260624_ai-literacy-v3`) から本フォルダにコピー:
   - `index.html`
   - `app.js`
   - `style.css`
   - `Cheers.mp3`
   - `WebsiteDuringthegame.mp3`
   - `whistle-start.mp3`
   - `assets/` フォルダ全体
2. コピーしたら `npx serve .` で起動し、V3がそのまま動くことを確認。
3. **確認**: ブラウザで開いてV3の画面が表示される → Step 1 へ。

- [ ] Step 0 完了

---

## Step 1: 問題データの接続

**目的**: V3の問題読み込みを食/旬検定の1プール制に差し替える。

### 1-A. PROFESSIONS の削除・簡略化

`app.js` の `PROFESSIONS` 配列と職業選択画面のロジックを除去。問題は `questions/食材.json` から固定で読む。

```javascript
// 旧（V3）: PROFESSIONS配列 → 削除
// 新: 問題ファイルは1つだけ
async function loadQuestions() {
    const url = `questions/${encodeURIComponent('食材')}.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`問題データの取得に失敗: ${url}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('問題データが空です');
    return data;
}
```

### 1-B. DOMAINS 定数の差し替え

```javascript
const DOMAINS = [
    { key: 'season',     label: '旬どき' },
    { key: 'megiki',     label: '目利き' },
    { key: 'hozon',      label: '保存・追熟' },
    { key: 'tabegoro',   label: '食べごろ' },
    { key: 'hinshu',     label: '品種のひみつ' },
    { key: 'tsukaikiri', label: '使いきり' },
];

const DOMAIN_HINTS = {
    season:     '旬の時期を知ると、美味しい果物に出会える確率がグンと上がります',
    megiki:     '見た目で選ぶコツを覚えると、ハズレを引かなくなります',
    hozon:      '正しい保存法を知るだけで、果物の寿命が何倍にもなります',
    tabegoro:   '食べごろの見極めは、農家だけが知る最高の贅沢です',
    hinshu:     '品種の違いを知ると、同じ果物でもまったく別の世界が広がります',
    tsukaikiri: '使い切りの知恵は、食材への感謝と節約の両立です',
};
```

### 1-C. pickQuestions() の修正

`q.munakata_step` → `q.domain` に読み替える。

```javascript
// analyzeDomains 内も同様
// 旧: const step = entry.question.munakata_step;
// 新: const step = entry.question.domain;
```

### 1-D. 動作確認

- `npx serve .` で起動
- 18問が出題され、レーダーチャートに6軸が表示されることを確認

- [ ] Step 1 完了

---

## Step 2: 画面遷移の簡略化

**目的**: 職業選択・難易度選択画面を省き、スタート→ゲーム→結果の3画面にする。

### 2-A. index.html の画面削除

- 職業選択画面 (`select` screen) を削除
- 難易度選択画面 (`difficulty` screen) を削除
- スタート画面のボタンは直接ゲーム開始へ

### 2-B. app.js の state 遷移

```
スタート(start) → [スペース/Enter] → ゲーム(game) → 結果(result)
                                          ↑                  |
                                          └── Esc中断 ──┘→ start
```

- スタート画面でスペース/Enter → `loadQuestions()` → `pickQuestions()` → ゲーム開始
- 職業・難易度の選択ステップを省略
- Escはスタート画面へ戻す

### 2-C. 動作確認

- スタート→即ゲーム→結果の3ステップで動くことを確認
- Escでスタートに戻ることを確認

- [ ] Step 2 完了

---

## Step 3: テーマ・文言・ビジュアルの差し替え

**目的**: AIリテラシー診断 → 食/旬検定のトーンに全面差し替え。

### 3-A. index.html のテキスト

| 箇所 | V3（旧） | 食/旬検定（新） |
|---|---|---|
| タイトル | AIリテラシー診断 | 食の目利き検定 |
| サブタイトル | あなたのAI偏差値を測る | あなたの"食リテラシー"、何点？ |
| スタートボタン | 診断スタート | 検定スタート |
| meta title | AIリテラシー診断 V3 | 食の目利き検定——旬を知る、目利きを磨く |
| meta description | （AIリテラシー系） | 「この果物、いつが旬？」「美味しい見分け方は？」——いちじく・桃農家が出す18問。あなたの食リテラシー偏差値が分かります。 |

### 3-B. style.css のテーマ色

- V3のアクセントカラー（AIっぽい青系）→ 食/農を連想する色に差し替え
- 推奨: メインアクセント `#e67e22`（温かいオレンジ）or `#2ecc71`（フレッシュグリーン）
- ダーク/ライトの両対応を維持

### 3-C. コーチマーク（ゲーム内ガイド）

- V3: 「AIの使い方を良い/ダメで仕分けよう」
- 新: 「食の常識を ○正しい/×ちがう で仕分けよう」
- 左ゾーン: ❌ ちがう / 右ゾーン: ⭕ 正しい

### 3-D. 結果画面の文言

- 弱点名指し: 「あなたの穴は『○○力』」→「あなたの弱点は『○○』」
- 偏差値: 「AIリテラシー偏差値」→「食リテラシー偏差値」
- ティアカード: 金/銀/銅/紙のラベルはそのまま（汎用的）
- PNGカードのタイトル: 「AIリテラシー診断」→「食の目利き検定」
- PNGカードのクレジット: 「お悩み解決サイト選手権」はそのまま

### 3-E. Xシェアテキスト

```
食リテラシー偏差値{score}！弱点は「{weakness}」🍑
あなたの食の目利き力は？👇
{url}
#食の目利き検定 #お悩み解決サイト選手権
```

### 3-F. 動作確認

- 全画面の文言がAI→食に変わっていることを目視確認
- PNGカードを保存して「食の目利き検定」と表示されることを確認
- Xシェアボタンのテキストを確認

- [ ] Step 3 完了

---

## Step 4: OGP・favicon

**目的**: SNSシェア時のサムネイルを食テーマに。

- OGP画像（1200x630）を作成。果物のイラストor写真 + タイトル「食の目利き検定」。
- favicon を食テーマに（🍑絵文字でもOK、SVG favicon推奨）。
- `<link rel="icon">` と `<meta property="og:image">` を更新。

- [ ] Step 4 完了

---

## Step 5: 最終テスト＆デプロイ

**目的**: ブラウザテスト + Netlify デプロイ。

### 5-A. テスト項目

- [ ] PC Chrome: スタート→18問→結果→レーダー→PNGカード保存→Xシェア
- [ ] スマホ（タッチ操作）: 左右タップで回答、カード保存
- [ ] キーボードナビ: ←→で回答、Enter/Spaceでスタート、Escで中断
- [ ] BGM・SE・ホイッスルが鳴る
- [ ] コーチマークが初回に表示され、タップ/キーで消える
- [ ] 作者タブ「もくもく」が開ける
- [ ] ダーク/ライト切替

### 5-B. Netlify デプロイ

```bash
# Netlify CLIでデプロイ（新サイトとして）
netlify deploy --prod --dir .
```

- デプロイ後のURLをメモ → 応募フォームに入力。

- [ ] Step 5 完了

---

## Step 6: 応募フォーム提出

**目的**: お悩み解決サイト選手権に2作品目としてエントリー。

応募4フィールドは会議室が別途設計する（Second Brain → 作品2_食旬検定_設計ドラフト.md）。
デプロイURL確定後、会議室とアツシで最終文面を確定→提出。

- [ ] Step 6 完了

---

> **全Step完了条件**: Step 5 のテスト全項目が ✅ で、Netlify に本番デプロイされていること。
