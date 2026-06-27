// ============================================================
//  AIリテラシー検定 V3 — ゲームエンジン（データ駆動）
// ============================================================
//  問題データはコードに持たず questions/<職業>.json から fetch する。
//  出題は domain_qualia : munakata_* = 6 : 4 の比率で10問を抽出する。
// ============================================================

// ============================================================
// QUESTION LOADING（データ／エンジン分離）
// ============================================================
// 選択された職業の問題プールを取得する。
// ※ ファイル名は日本語のため encodeURIComponent でURLエンコードする。
// ※ ローカルは file:// では fetch できないため HTTP 配信が必須。
async function loadQuestions() {
    const url = `questions/${encodeURIComponent('食材')}.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`問題データの取得に失敗: ${url}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('問題データが空です');
    return data;
}

// 6ドメイン × 3問 = 18問を均等配分で抽出。不足ドメインは他から補充。
function pickQuestions(pool, total = 18, diffRange = null) {
    let filtered = pool;
    if (diffRange) {
        const [lo, hi] = diffRange;
        filtered = pool.filter(q => {
            const d = q.difficulty ?? 1;
            return d >= lo && d <= hi;
        });
    }
    if (filtered.length === 0) filtered = pool;

    const perDomain = Math.floor(total / DOMAINS.length); // 3
    const groups = {};
    DOMAINS.forEach(d => { groups[d.key] = []; });
    filtered.forEach(q => {
        const step = q.domain;
        if (step && groups[step]) groups[step].push(q);
    });

    let selected = [];
    const surplus = [];
    for (const d of DOMAINS) {
        const shuffled = shuffle(groups[d.key]);
        selected.push(...shuffled.slice(0, perDomain));
        surplus.push(...shuffled.slice(perDomain));
    }

    // 不足分（3問未満だったドメインの穴）を余剰から補充
    if (selected.length < total) {
        const used = new Set(selected);
        const rest = shuffle(surplus.filter(q => !used.has(q)));
        selected = selected.concat(rest.slice(0, total - selected.length));
    }

    // それでもまだ足りなければ、difficulty 範囲外の問題からも補充
    if (selected.length < total && diffRange) {
        const used = new Set(selected);
        const fallback = shuffle(pool.filter(q => !used.has(q)));
        selected = selected.concat(fallback.slice(0, total - selected.length));
    }

    return shuffle(selected);
}

// ============================================================
// PROFESSIONS（職業マスタ）
// ============================================================
// key はJSONファイル名（questions/<key>.json）と一致させる。
// available=false の職業は Step 7 で問題JSONを生成するまで「準備中」で非活性。
const DOMAINS = [
    { key: 'season',     label: '旬' },
    { key: 'megiki',     label: '目利き' },
    { key: 'hozon',      label: '保存' },
    { key: 'tabegoro',   label: '食べ方' },
    { key: 'hinshu',     label: '品種' },
    { key: 'tsukaikiri', label: '使い切り' },
];

const DOMAIN_HINTS = {
    season:     '旬の時期を知ると、美味しい果物に出会える確率がグンと上がります',
    megiki:     '見た目で選ぶコツを覚えると、ハズレを引かなくなります',
    hozon:      '正しい保存法を知るだけで、果物の寿命が何倍にもなります',
    tabegoro:   '食べごろの見極めは、農家だけが知る最高の贅沢です',
    hinshu:     '品種の違いを知ると、同じ果物でもまったく別の世界が広がります',
    tsukaikiri: '使い切りの知恵は、食材への感謝と節約の両立です',
};

function analyzeDomains(log) {
    const stats = {};
    DOMAINS.forEach(d => { stats[d.key] = { total: 0, correct: 0 }; });
    log.forEach(entry => {
        const step = entry.question.domain;
        if (step && stats[step]) {
            stats[step].total++;
            if (entry.ok) stats[step].correct++;
        }
    });
    return stats;
}

function calcDeviation(accuracy) {
    const raw = 50 + (accuracy - 0.5) * 100;
    return Math.round(Math.max(20, Math.min(80, raw)));
}

function findWeakness(domainStats) {
    let worst = null;
    let worstRate = Infinity;
    for (const d of DOMAINS) {
        const s = domainStats[d.key];
        if (s.total === 0) continue;
        const rate = s.correct / s.total;
        if (rate < worstRate) {
            worstRate = rate;
            worst = d;
        }
    }
    return worst;
}

function accentToRgba(colorStr, alpha) {
    const tmp = document.createElement('canvas').getContext('2d');
    tmp.fillStyle = colorStr;
    tmp.fillRect(0, 0, 1, 1);
    const [r, g, b] = tmp.getImageData(0, 0, 1, 1).data;
    return `rgba(${r},${g},${b},${alpha})`;
}

function drawRadar(domainStats) {
    const canvas = UI.radarCanvas;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = 240;
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width  = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const R  = 85;
    const n  = DOMAINS.length;
    const angleStep = (Math.PI * 2) / n;
    const startAngle = -Math.PI / 2;

    const style = getComputedStyle(document.documentElement);
    const textColor = style.getPropertyValue('--text').trim();
    const dimColor  = style.getPropertyValue('--text-dim').trim();
    const accent    = style.getPropertyValue('--accent').trim();
    const borderCol = style.getPropertyValue('--border-strong').trim();

    ctx.clearRect(0, 0, size, size);

    // grid lines (3 levels)
    for (let level = 1; level <= 3; level++) {
        const r = R * level / 3;
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
            const a = startAngle + angleStep * (i % n);
            const x = cx + r * Math.cos(a);
            const y = cy + r * Math.sin(a);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = borderCol;
        ctx.lineWidth = 0.8;
        ctx.stroke();
    }

    // axis lines
    for (let i = 0; i < n; i++) {
        const a = startAngle + angleStep * i;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
        ctx.strokeStyle = borderCol;
        ctx.lineWidth = 0.6;
        ctx.stroke();
    }

    // data polygon
    const rates = DOMAINS.map(d => {
        const s = domainStats[d.key];
        return s.total > 0 ? s.correct / s.total : 0;
    });

    ctx.beginPath();
    rates.forEach((rate, i) => {
        const a = startAngle + angleStep * i;
        const r = R * rate;
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = accentToRgba(accent, 0.25);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.stroke();

    // data points
    rates.forEach((rate, i) => {
        const a = startAngle + angleStep * i;
        const r = R * rate;
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = accent;
        ctx.fill();
    });

    // labels
    ctx.font = '500 11px "Zen Maru Gothic", sans-serif';
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
        ctx.font = '500 11px "Zen Maru Gothic", sans-serif';
    });
}

// ============================================================
// RANK SYSTEM
// ============================================================
const RANKS = [
    {
        minAccuracy: 0.8,
        name: '伝説の食通（超越者）',
        emoji: '👑',
        advice: 'お見事！農家も驚くほどの圧倒的な食リテラシーです。旬を逃さず、美味しいものを完璧に見極めるあなたの目はプロそのもの。これからも豊かな食生活を楽しみながら、周囲にもその知恵を分けてあげてください。',
    },
    {
        minAccuracy: 0.6,
        name: 'こだわり食いしん坊',
        emoji: '😋',
        advice: '素晴らしい！食の常識をしっかり身につけています。美味しさのポイントや保存法を理解しており、日々の食事をとても豊かに楽しめているはず。あと一歩で、農家顔負け of 目利きになれます！',
    },
    {
        minAccuracy: 0.4,
        name: 'お買い物見習い',
        emoji: '🛒',
        advice: '伸びしろ十分！なんとなく感覚で選んでいる部分があるかもしれません。でも大丈夫、知るだけで変わるコツばかりです。次に買い物に行くときは、学んだポイントを一つずつ試してみてくださいね。',
    },
    {
        minAccuracy: 0,
        name: '伸びしろしかない消費者',
        emoji: '🌱',
        advice: 'ここがスタートラインです！今まで知らなかった食の常識に触れて、世界が少し広がったはず。スーパーでの果物・野菜選びがもっと面白くなりますよ。焦らず、美味しい体験を重ねていきましょう！',
    }
];

// ============================================================
// FOOD TYPE SYSTEM
// ============================================================
const FOOD_TYPES = {
    season:     { name: '旬ハンター',     emoji: '🗓', message: '旬を知ってる人は、スーパーで宝探しができる' },
    megiki:     { name: '目利きの達人',   emoji: '👀', message: '美味しいを見分ける目は、一生モノの財産です' },
    hozon:      { name: '保存マスター',   emoji: '❄',  message: '正しく保存すれば、果物の命が何倍にも伸びる' },
    tabegoro:   { name: '食べごろ名人',   emoji: '🍽', message: '食べごろを見極める人は、日常を贅沢にできる' },
    hinshu:     { name: '品種マニア',     emoji: '🌱', message: '品種名を見る習慣だけで、果物体験が別世界になる' },
    tsukaikiri: { name: '使いきり番長',   emoji: '♻',  message: '捨てない知恵は、食材への最高の敬意です' },
    balanced:   { name: '食リテラシーマスター', emoji: '🏆', message: 'バランス型。農家も認める食通です' },
};

function determineFoodType(domainStats) {
    let bestKey = null;
    let bestRate = -1;
    let tieCount = 0;
    for (const d of DOMAINS) {
        const s = domainStats[d.key];
        if (!s || s.total === 0) continue;
        const rate = s.correct / s.total;
        if (rate > bestRate) {
            bestRate = rate;
            bestKey = d.key;
            tieCount = 1;
        } else if (rate === bestRate) {
            tieCount++;
        }
    }
    if (tieCount === DOMAINS.length || bestKey === null) return FOOD_TYPES.balanced;
    return FOOD_TYPES[bestKey];
}

// ============================================================
// WEAKNESS ADVICE FROM FARMER
// ============================================================
const WEAKNESS_ADVICE = {
    season:     '次スーパー行ったら、値札の横の「産地・品種名」だけチェックしてみて。旬が見えてきます。',
    megiki:     '目利きは慣れです。次に桃を買うとき、軸の周りの色だけ見てみて。それだけで変わります。',
    hozon:      '「食べる2時間前に冷蔵庫へ」。これだけ覚えれば、果物の味が一段上がります。',
    tabegoro:   'まずは一回、桃を手でむいてかぶりついてみてください。包丁は要りません。',
    hinshu:     'スーパーの値札に品種名が書いてあります。同じ桃でも全然違うので、名前で選ぶクセをつけてみて。',
    tsukaikiri: '食べきれない果物は迷わず冷凍庫へ。半解凍でシャーベットにすれば、最高のおやつになります。',
};

// ============================================================
// RESULT CARD TIER（カード色のティア）
// ============================================================
const CARD_TIERS = [
    { key: 'perfect', cssClass: 'tier-gold'   },  // 正解率100%のみ
    { key: 'silver',  cssClass: 'tier-silver'  },  // 偏差値70以上
    { key: 'bronze',  cssClass: 'tier-bronze'  },  // 偏差値60以上
    { key: 'paper',   cssClass: 'tier-paper'   },  // その他
];

function getCardTier(deviation, accuracy, allAnswered) {
    // ゴールドは正解率100%かつ全問回答のみ（偏差値に関係なく）
    if (accuracy >= 1.0 && allAnswered) return CARD_TIERS[0];  // perfect → gold
    // それ以外は偏差値で仕分け
    if (deviation >= 70)  return CARD_TIERS[1];  // silver
    if (deviation >= 60)  return CARD_TIERS[2];  // bronze
    return CARD_TIERS[3];                         // paper
}

// ============================================================
// MP3 SOUND ASSETS
// ============================================================
const SFX_WHISTLE = new Audio('whistle-start.mp3');
const BGM_GAME    = new Audio('WebsiteDuringthegame.mp3');
const SFX_CHEERS  = new Audio('Cheers.mp3');
BGM_GAME.loop = true;
BGM_GAME.volume = 0.35;  // BGMは控えめ（SEより小さく）
SFX_WHISTLE.volume = 0.6;
SFX_CHEERS.volume = 0.5;

function playWhistle() {
    SFX_WHISTLE.currentTime = 0;
    SFX_WHISTLE.play().catch(() => {});
}

function startBGM() {
    BGM_GAME.currentTime = 0;
    BGM_GAME.play().catch(() => {});
}

function stopBGM() {
    BGM_GAME.pause();
    BGM_GAME.currentTime = 0;
}

// ============================================================
// WEB AUDIO ENGINE
// ============================================================
let audioCtx = null;

function ensureAudio() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (_) { /* silently fail if not supported */ }
    }
    // Resume if suspended (autoplay policy)
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

function playBeep(freq, dur, type = 'square', vol = 0.22, delay = 0) {
    if (!audioCtx) return;
    try {
        const osc  = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const now  = audioCtx.currentTime + delay;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        osc.start(now);
        osc.stop(now + dur + 0.01);
    } catch (_) { /* ignore */ }
}

function sfxCorrect() {
    playBeep(523, 0.08, 'square', 0.18);
    playBeep(659, 0.12, 'square', 0.18, 0.09);
}

function sfxWrong() {
    playBeep(220, 0.18, 'square', 0.28);
    playBeep(165, 0.25, 'square', 0.20, 0.16);
}

function sfxCombo(n) {
    const base = 440 + n * 40;
    playBeep(base,        0.09, 'triangle', 0.22);
    playBeep(base * 1.25, 0.13, 'triangle', 0.18, 0.10);
    playBeep(base * 1.5,  0.15, 'triangle', 0.14, 0.22);
}

function sfxGameOver() {
    playBeep(330, 0.14, 'square', 0.20);
    playBeep(277, 0.18, 'square', 0.18, 0.15);
    playBeep(220, 0.22, 'square', 0.16, 0.34);
    playBeep(165, 0.45, 'square', 0.14, 0.58);
}

// ============================================================
// GAME STATE
// ============================================================
const state = {
    screen:        'start',
    profession:    null,
    difficulty:    null,   // 'beginner' | 'advanced'
    questions:     [],
    currentIndex:  0,
    score:         0,
    combo:         0,
    maxCombo:      0,
    correctCount:  0,
    totalAnswered: 0,
    timeLeft:      60.0,
    timerHandle:   null,
    isAnswering:   false,
    log:           [],
    coachActive:   false,
};

// ============================================================
// DOM REFERENCES
// ============================================================
const $ = id => document.getElementById(id);

const SCREENS = {
    start:      $('start-screen'),
    game:       $('game-screen'),
    result:     $('result-screen'),
};

const UI = {
    btnStart:       $('btn-start'),
    btnAbort:       $('btn-abort'),
    themeToggle:   $('theme-toggle'),
    scoreVal:      $('score-val'),
    comboVal:      $('combo-val'),
    comboContainer:$('combo-container'),
    timeVal:       $('time-val'),
    timeBar:       $('time-bar'),
    questStepsContainer: $('quest-steps-container'),
    progressText:  $('progress-text'),
    qCategory:     $('q-category'),
    qText:         $('q-text'),
    card:          $('question-card'),
    zoneLeft:      $('zone-left'),
    zoneRight:     $('zone-right'),
    gameCoach:     $('game-coach'),
    deviationVal:  $('deviation-val'),
    weaknessBox:   $('weakness-box'),
    weaknessName:  $('weakness-name'),
    radarCanvas:   $('radar-canvas'),
    rcProfession:  $('rc-profession'),
    btnSaveCard:   $('btn-save-card'),
    resultRank:    $('result-rank'),
    correctCount:  $('correct-count'),
    totalCount:    $('total-count'),
    accuracyVal:   $('accuracy-val'),
    resultAdvice:  $('result-advice'),
    btnShare:      $('btn-share'),
    btnRetry:      $('btn-retry'),
    reviewList:    $('review-list'),
};

// Dynamically injected feedback overlay
const feedbackEl = document.createElement('div');
feedbackEl.className = 'feedback-overlay';
document.getElementById('app').appendChild(feedbackEl);

// ============================================================
// THEME（ライト/ダーク・localStorage保存・ダーク既定）
// ============================================================
const THEME_KEY = 'ai-kentei-theme';

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    // 押すと切り替わる先のアイコンを表示（ダーク中は☀️、ライト中は🌙）
    UI.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    UI.themeToggle.setAttribute('aria-label', theme === 'dark' ? 'ライトに切替' : 'ダークに切替');
}

function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    applyTheme(saved === 'dark' ? 'dark' : 'light'); // 既定はライト
}

function toggleTheme() {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(THEME_KEY, next); } catch (_) { /* private mode等は無視 */ }
    applyTheme(next);
}

// ============================================================
// SCREEN MANAGEMENT
// ============================================================
function showScreen(name) {
    Object.values(SCREENS).forEach(s => {
        s.classList.add('hidden');
        s.classList.remove('active');
    });
    SCREENS[name].classList.remove('hidden');
    SCREENS[name].classList.add('active');
    state.screen = name;

    // 時間切れ表示のクリーンアップ
    const resultCard = document.getElementById('result-card');
    if (resultCard) {
        resultCard.classList.remove('timeout-result');
    }
    const timeoutDetail = document.getElementById('rc-timeout-detail');
    if (timeoutDetail) {
        timeoutDetail.style.display = 'none';
    }
}

// ============================================================
// PROFESSION SELECT
// ============================================================
// 職業カードを描画する。available=false はグレーアウト＋「準備中」バッジで非活性。
function renderProfessionCards() {
    UI.professionGrid.innerHTML = '';
}

// ============================================================
// DIFFICULTY SELECT
// ============================================================
const DIFF_RANGE = {
    beginner: [1, 2],
    advanced: [2, 3],
};



// ============================================================
// GAME LOGIC
// ============================================================
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// 問題JSONを読み込んでゲームを開始する（非同期）。
async function startGame() {
    ensureAudio();
    state.profession = '食の目利き';
    state.difficulty = null;

    let pool;
    try {
        pool = await loadQuestions();
    } catch (err) {
        console.error(err);
        alert('問題データを読み込めませんでした。');
        return;
    }

    Object.assign(state, {
        questions:     pickQuestions(pool, 18, null),
        currentIndex:  0,
        score:         0,
        combo:         0,
        maxCombo:      0,
        correctCount:  0,
        totalAnswered: 0,
        timeLeft:      60.0,
        isAnswering:   false,
        log:           [],
        coachActive:   true,
    });

    renderScore();
    renderCombo();
    renderTimer();
    initQuestSteps(state.questions.length);
    renderProgress();
    showScreen('game');
    loadQuestion();
}

// 中断＝リトライ動線：確認ダイアログ→OKでタイマー停止・状態破棄して職業選択（ハブ）へ戻す。
function abortGame() {
    if (state.screen !== 'game') return;
    const proceed = window.confirm('最初からやり直しますか？（今の記録は残りません）');
    if (!proceed) return; // キャンセル＝ゲーム継続

    clearInterval(state.timerHandle);
    stopBGM();
    state.isAnswering = true; // 遷移中の回答を封じる
    state.questions   = [];
    state.log         = [];
    state.currentIndex = 0;
    showScreen('start');
}

function loadQuestion() {
    if (state.currentIndex >= state.questions.length) {
        endGame();
        return;
    }
    const q = state.questions[state.currentIndex];
    UI.qCategory.textContent = q.category;
    UI.qText.textContent     = q.text;
    UI.card.className = 'card';
    renderProgress();
    state.isAnswering = false;

    if (state.currentIndex === 0) {
        if (state.coachActive) {
            UI.gameCoach.classList.remove('hidden');
        } else {
            UI.gameCoach.classList.add('hidden');
            startTimer();
        }
    } else {
        UI.gameCoach.classList.add('hidden');
        state.coachActive = false;
    }
}

function dismissCoach() {
    if (state.coachActive) {
        state.coachActive = false;
        UI.gameCoach.classList.add('hidden');
        playWhistle();
        setTimeout(startBGM, 800);
        startTimer();
    }
}

function answer(choice) {
    if (state.coachActive) {
        dismissCoach();
        return;
    }
    if (state.isAnswering || state.screen !== 'game') return;
    state.isAnswering = true;

    const q = state.questions[state.currentIndex];
    const ok = choice === q.correct;

    state.totalAnswered++;

    if (ok) {
        state.correctCount++;
        state.combo++;
        if (state.combo > state.maxCombo) state.maxCombo = state.combo;

        const bonusTier = Math.min(state.combo - 1, 9);
        state.score += 100 + bonusTier * 50;
        state.timeLeft = Math.min(state.timeLeft + 2, 60.0);
        showTimeBonus(2);

        UI.card.classList.add('flash-good');
        showFeedback(true, state.combo);
        sfxCorrect();
        if (state.combo >= 3) sfxCombo(state.combo);
    } else {
        state.combo = 0;
        UI.card.classList.add('flash-bad');
        showFeedback(false, 0);
        sfxWrong();
    }

    state.log.push({ question: q, choice, ok });
    renderScore();
    renderCombo();

    setTimeout(() => {
        state.currentIndex++;
        loadQuestion();
    }, 420);
}

function showFeedback(ok, combo) {
    let text = ok ? '✓ GOOD!' : '✗ BAD!';
    if (ok && combo >= 3) text = `${combo} COMBO!!`;

    feedbackEl.className = 'feedback-overlay';
    feedbackEl.textContent = text;

    // Force reflow to restart animation
    void feedbackEl.offsetWidth;
    feedbackEl.classList.add(ok ? 'show-good' : 'show-bad');

    setTimeout(() => { feedbackEl.className = 'feedback-overlay'; }, 500);
}

function showTimeBonus(seconds) {
    const parent = UI.timeVal.parentElement;
    parent.style.position = 'relative';
    const bonus = document.createElement('span');
    bonus.className = 'time-bonus';
    bonus.textContent = `+${seconds}s`;
    parent.appendChild(bonus);
    setTimeout(() => bonus.remove(), 800);
}

function flashZone(side) {
    const el = side === 'bad' ? UI.zoneLeft : UI.zoneRight;
    if (el) {
        el.classList.add('key-pressed');
        setTimeout(() => el.classList.remove('key-pressed'), 150);
    }
}

// ============================================================
// TIMER
// ============================================================
function startTimer() {
    clearInterval(state.timerHandle);
    state.timerHandle = setInterval(() => {
        state.timeLeft -= 0.1;
        if (state.timeLeft <= 0) {
            state.timeLeft = 0;
            renderTimer();
            clearInterval(state.timerHandle);
            endGame();
        } else {
            renderTimer();
        }
    }, 100);
}

function renderTimer() {
    const t     = Math.max(0, state.timeLeft);
    const ratio = t / 60;

    UI.timeVal.textContent    = t.toFixed(1);
    UI.timeBar.style.width    = `${ratio * 100}%`;
    UI.timeBar.className      = 'progress-bar';
    if (ratio < 0.2)       UI.timeBar.classList.add('danger');
    else if (ratio < 0.4)  UI.timeBar.classList.add('warning');

    if (t <= 10) {
        UI.timeVal.classList.add('timer-danger');
    } else {
        UI.timeVal.classList.remove('timer-danger');
    }
}

function initQuestSteps(total) {
    if (!UI.questStepsContainer) return;
    UI.questStepsContainer.innerHTML = '';
    for (let i = 0; i < total; i++) {
        const step = document.createElement('div');
        step.className = 'quest-step';
        UI.questStepsContainer.appendChild(step);
    }
}

function renderProgress() {
    const total = state.questions.length;
    const cur   = state.currentIndex;
    UI.progressText.textContent = `${cur}/${total}`;

    if (UI.questStepsContainer) {
        const steps = UI.questStepsContainer.querySelectorAll('.quest-step');
        steps.forEach((step, idx) => {
            if (idx < cur) {
                step.className = 'quest-step is-completed';
            } else if (idx === cur) {
                step.className = 'quest-step is-active';
            } else {
                step.className = 'quest-step';
            }
        });
    }
}

function renderScore() {
    UI.scoreVal.textContent = String(state.score).padStart(5, '0');
}

function getComboColor(count) {
    if (count >= 10) return '#fbbf24';
    if (count >= 6)  return '#ef4444';
    if (count >= 3)  return '#f59e0b';
    return null;
}

function getComboLabel(count) {
    if (count >= 10) return 'AMAZING!';
    if (count >= 6)  return 'GREAT!';
    if (count >= 3)  return 'NICE!';
    return 'COMBO';
}

function renderCombo() {
    const c = state.combo;
    UI.comboVal.textContent = c;
    const showing = c >= 2;
    UI.comboContainer.className = showing ? 'combo-visible' : 'combo-invisible';

    if (showing) {
        // pop animation
        UI.comboContainer.classList.remove('combo-pop');
        void UI.comboContainer.offsetWidth;
        UI.comboContainer.classList.add('combo-pop');

        // heat-up color
        const color = getComboColor(c);
        UI.comboVal.style.color = color || '';
        UI.comboContainer.style.borderColor = color || 'var(--combo)';
        UI.comboContainer.classList.toggle('combo-glow', c >= 10);

        // label change
        const labelEl = UI.comboContainer.querySelector('.label');
        if (labelEl) labelEl.textContent = getComboLabel(c);
    }
}

// ============================================================
// END GAME / RESULT SCREEN
// ============================================================
function endGame() {
    clearInterval(state.timerHandle);
    stopBGM();
    playWhistle();

    const accuracy = state.totalAnswered > 0
        ? state.correctCount / state.totalAnswered
        : 0;

    // 時間切れ時は全問ベースの正解率で偏差値を算出
    const allAnswered = state.totalAnswered >= state.questions.length;
    const deviationAccuracy = allAnswered ? accuracy : state.correctCount / state.questions.length;
    const isPerfect = accuracy >= 1.0 && allAnswered;
    const isTimeout = state.timeLeft <= 0;

    if (!isPerfect) {
        setTimeout(() => sfxGameOver(), 1000);
    }

    const rank = RANKS.find(r => accuracy >= r.minAccuracy) || RANKS[RANKS.length - 1];
    const deviation = calcDeviation(deviationAccuracy);
    const domainStats = analyzeDomains(state.log);
    const weakness = findWeakness(domainStats);

    // 食タイプの決定
    const foodType = determineFoodType(domainStats);
    const typeEl = document.getElementById('rc-food-type');
    const typeMsgEl = document.getElementById('rc-food-type-msg');
    if (typeEl) typeEl.textContent = `${foodType.emoji} ${foodType.name}`;
    if (typeMsgEl) typeMsgEl.textContent = foodType.message;

    UI.deviationVal.textContent = deviation;
    UI.resultRank.textContent   = `${rank.emoji} ${rank.name}`;
    UI.correctCount.textContent = state.correctCount;
    UI.totalCount.textContent   = state.questions.length;
    UI.accuracyVal.textContent  = Math.round(accuracy * 100);
    UI.resultAdvice.textContent = rank.advice;

    if (weakness) {
        UI.weaknessBox.style.display = '';
        UI.weaknessName.innerHTML = `<strong>『${weakness.label}』</strong>`;
        
        // 農家アツシからのアドバイスを表示
        const advBox = document.getElementById('weakness-advice-box');
        const advDetail = document.getElementById('weakness-advice-detail');
        if (advBox && advDetail) {
            advBox.style.display = 'block';
            advDetail.textContent = (WEAKNESS_ADVICE[weakness.key] || '') + ' 🍑 農家アツシより';
        }
    } else {
        UI.weaknessBox.style.display = 'none';
        
        // 弱点がない場合はアドバイスボックスを非表示に
        const advBox = document.getElementById('weakness-advice-box');
        if (advBox) advBox.style.display = 'none';
    }

    // --- ティア演出 ---
    const tier = getCardTier(deviation, accuracy, allAnswered);
    const resultCard = document.getElementById('result-card');
    
    // 前回のティアクラスをリセット
    if (resultCard) {
        resultCard.classList.remove('tier-gold', 'tier-silver', 'tier-bronze', 'tier-paper');
        resultCard.classList.add(tier.cssClass);
    }

    // パーフェクト（全問正解）時の祝福
    if (isPerfect) {
        UI.resultRank.textContent = '🏆 PERFECT — 伝説の食通（超越者）';
        // 弱点なしの場合は伸びしろ非表示（パーフェクトに弱点はない）
        UI.weaknessBox.style.display = 'none';
        const advBox = document.getElementById('weakness-advice-box');
        if (advBox) advBox.style.display = 'none';
        
        setTimeout(() => {
            SFX_CHEERS.currentTime = 0;
            SFX_CHEERS.play().catch(() => {});
        }, 500);
    }

    // 時間切れ時の専用UI表示
    if (isTimeout && !allAnswered) {
        if (resultCard) {
            resultCard.classList.add('timeout-result');
        }
        
        // 全問回答していない場合の表示
        const unanswered = state.questions.length - state.totalAnswered;
        UI.resultRank.textContent = `⏱️ TIME UP — ${unanswered}問残して終了`;
        
        // 丁寧に考えたことを褒めるアドバイス
        if (accuracy >= 0.8) {
            UI.resultAdvice.textContent = 
                `回答した${state.totalAnswered}問中${state.correctCount}問正解（正解率${Math.round(accuracy * 100)}%）は素晴らしい精度です。` +
                `じっくり考えて正確に答えるスタイルも立派な実力。` +
                `次はスピードも意識して、全${state.questions.length}問完走を目指してみましょう！`;
        } else {
            UI.resultAdvice.textContent = 
                `${state.totalAnswered}問に挑戦しました。` +
                `まずは正確さを磨き、慣れてきたらスピードも上げていきましょう。` +
                `繰り返すほど食の目利きの地図が広がります。`;
        }

        // 回答数を表示
        const timeoutDetail = document.getElementById('rc-timeout-detail');
        if (timeoutDetail) {
            timeoutDetail.style.display = 'block';
            const answeredEl = document.getElementById('rc-timeout-answered');
            const totalEl = document.getElementById('rc-timeout-total');
            if (answeredEl) answeredEl.textContent = state.totalAnswered;
            if (totalEl) totalEl.textContent = state.questions.length;
        }
    }

    UI.rcProfession.textContent = state.profession;

    drawRadar(domainStats);
    buildReviewList();
    setupShareButton(rank, accuracy, deviation, weakness, foodType);

    showScreen('result');
}

function buildReviewList() {
    UI.reviewList.innerHTML = '';
    state.log.forEach(entry => {
        const { question: q, ok, choice } = entry;
        const correctLabel = q.correct === 'good' ? '正しい ➔' : 'ちがう ⬅';
        const verdict = ok
            ? `✓ 正解！（${correctLabel}）`
            : `✗ 不正解　正解: ${correctLabel}`;

        const truncated = q.text.length > 55 ? q.text.slice(0, 55) + '…' : q.text;

        const div = document.createElement('div');
        div.className = `review-item ${ok ? 'correct' : 'wrong'}`;
        div.innerHTML = `
            <div class="review-q">${truncated}</div>
            <div class="review-verdict">${verdict}</div>
            <div class="review-explanation">${q.explanation}</div>
        `;
        UI.reviewList.appendChild(div);
    });
}

function setupShareButton(rank, accuracy, deviation, weakness, foodType) {
    const weakLabel = weakness ? weakness.label : '';
    const typeEmoji = foodType ? foodType.emoji : '🏆';
    const typeName  = foodType ? foodType.name : '食リテラシーマスター';
    const shareText = [
        `食リテラシー偏差値${deviation}！タイプは「${typeEmoji}${typeName}」🍑`,
        `弱点は「${weakLabel}」——あなたの食の目利き力は？👇`
    ].join('\n');

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(location.href)}&hashtags=${encodeURIComponent('食の目利き検定,お悩み解決サイト選手権')}`;
    UI.btnShare.onclick = () => window.open(twitterUrl, '_blank', 'noopener');
}



// ============================================================
// INPUT HANDLING
// ============================================================
// ============================================================
// KEYBOARD NAVIGATION（寿司打式・全画面キーボード操作）
// ============================================================
document.addEventListener('keydown', e => {
    const key = e.key;
    
    // --- フォーカスがボタン/リンク/input上 → ネイティブ動作を優先（二重発火防止）---
    const tag = document.activeElement?.tagName;
    if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'TEXTAREA') {
        // ただしEscは全画面で常に効かせる（戻る動作）
        if (key !== 'Escape') return;
    }

    switch (state.screen) {

        // === スタート画面 ===
        case 'start':
            if (key === ' ' || key === 'Enter') {
                e.preventDefault();
                startGame();
            }
            break;

        // === ゲーム画面 ===
        case 'game':
            if (key === 'Escape') {
                abortGame();
                return;
            }
            if (state.coachActive) {
                if (key === 'ArrowLeft' || key === 'ArrowRight' || key === ' ' || key === 'Enter') {
                    dismissCoach();
                    e.preventDefault();
                }
                return;
            }
            if (key === 'ArrowLeft')  { flashZone('bad');  answer('bad');  }
            if (key === 'ArrowRight') { flashZone('good'); answer('good'); }
            break;

        // === 結果画面 ===
        case 'result':
            if (key === ' ' || key === 'Enter') {
                e.preventDefault();
                startGame();  // もう一度挑戦
            }
            if (key === 'Escape') {
                e.preventDefault();
                showScreen('start');   // トップへ戻る
            }
            break;
    }
});

// Touch: full-screen left/right split (passive:false to block scroll jank)
SCREENS.game.addEventListener('touchstart', e => {
    if (state.screen !== 'game') return;
    if (state.coachActive) {
        dismissCoach();
        e.preventDefault();
        return;
    }
    // 中断ボタンのタップは左右仕分けの対象外（誤爆防止）。click を通すため preventDefault しない。
    if (e.target.closest('.game-abort')) return;
    e.preventDefault();
    const x = e.touches[0].clientX;
    answer(x < window.innerWidth / 2 ? 'bad' : 'good');
}, { passive: false });

// Click on touch-zone labels (desktop / accessibility)
UI.zoneLeft.addEventListener('click',  () => answer('bad'));
UI.zoneRight.addEventListener('click', () => answer('good'));

// Buttons
// スタート → ゲーム → 結果
UI.btnStart.addEventListener('click',      () => startGame());
UI.btnRetry.addEventListener('click',      () => startGame());
UI.btnAbort.addEventListener('click',      abortGame);
UI.themeToggle.addEventListener('click',   toggleTheme);
UI.gameCoach.addEventListener('click',     dismissCoach);

// カード保存
UI.btnSaveCard.addEventListener('click', saveResultCard);

// ============================================================
// PNG CARD SAVE
// ============================================================
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function saveResultCard() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const W = 360 * 2;
    const H = 640 * 2;
    canvas.width = W;
    canvas.height = H;

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const resultCard = document.getElementById('result-card');
    const tierClass = ['tier-gold','tier-silver','tier-bronze','tier-paper']
        .find(c => resultCard.classList.contains(c)) || 'tier-paper';
    
    const tierColors = {
        'tier-gold':   isDark ? ['#3d3510','#6e5a12'] : ['#fff9e6','#ffcc33'],
        'tier-silver': isDark ? ['#2a2a32','#3a3a48'] : ['#f5f5f7','#d8d8e3'],
        'tier-bronze': isDark ? ['#2e2418','#4a3b28'] : ['#f7ede2','#d4b896'],
        'tier-paper':  isDark ? ['#2a2520','#1e1b17'] : ['#faf6f0','#f0ebe3'],
    };
    const [c1, c2] = tierColors[tierClass];
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    roundRect(ctx, 0, 0, W, H, 40);
    ctx.fill();

    const textMain = isDark ? '#e2e8f0' : '#1e293b';
    const textDim  = isDark ? '#94a3b8' : '#64748b';
    const accent   = isDark ? '#e67e22' : '#d35400';
    const bad      = isDark ? '#d98072' : '#c75f4e';

    ctx.textAlign = 'center';

    ctx.fillStyle = textDim;
    ctx.font = '600 28px "Zen Maru Gothic", sans-serif';
    ctx.fillText('食の目利き検定', W / 2, 70);

    ctx.font = '500 24px "Zen Maru Gothic", sans-serif';
    ctx.fillText('食リテラシー偏差値', W / 2, 115);

    const deviation = UI.deviationVal.textContent;
    ctx.fillStyle = accent;
    ctx.font = '900 110px "Outfit", sans-serif';
    ctx.fillText(deviation, W / 2, 235);

    // 食タイプを描画 (絵文字 + タイプ名)
    const typeEl = document.getElementById('rc-food-type');
    const typeText = typeEl ? typeEl.textContent : '';
    ctx.fillStyle = accent;
    ctx.font = '800 30px "Zen Maru Gothic", sans-serif';
    ctx.fillText(typeText, W / 2, 290);

    const rankText = UI.resultRank.textContent;
    ctx.fillStyle = textMain;
    ctx.font = '700 26px "Zen Maru Gothic", sans-serif';
    ctx.fillText(rankText, W / 2, 335);

    const radarSrc = UI.radarCanvas;
    if (radarSrc) {
        ctx.drawImage(radarSrc, (W - 440) / 2, 380, 440, 440);
    }

    const weaknessText = UI.weaknessName.textContent;
    if (weaknessText) {
        ctx.fillStyle = textDim;
        ctx.font = '500 24px "Zen Maru Gothic", sans-serif';
        ctx.fillText('あなたの弱点は', W / 2, 875);
        ctx.fillStyle = bad;
        ctx.font = '900 34px "Zen Maru Gothic", sans-serif';
        ctx.fillText(weaknessText, W / 2, 925);
    }

    const correct = UI.correctCount.textContent;
    const total = UI.totalCount.textContent;
    const acc = UI.accuracyVal.textContent;
    ctx.fillStyle = textDim;
    ctx.font = '500 22px "Zen Maru Gothic", sans-serif';
    
    // 時間切れ時は画像にも回答数を反映
    const timeoutDetail = document.getElementById('rc-timeout-detail');
    const isTimeoutVisible = timeoutDetail && timeoutDetail.style.display !== 'none';
    if (isTimeoutVisible) {
        const answered = document.getElementById('rc-timeout-answered')?.textContent || '0';
        ctx.fillText(`正解 ${correct}/${total} (回答 ${answered}問)　正解率 ${acc}%`, W / 2, 1005);
    } else {
        ctx.fillText(`正解 ${correct}/${total}　正解率 ${acc}%`, W / 2, 1005);
    }

    const profName = UI.rcProfession.textContent;
    ctx.fillText(profName, W / 2, 1045);

    ctx.fillStyle = isDark ? '#475569' : '#cbd5e1';
    ctx.font = '400 20px "Zen Maru Gothic", sans-serif';
    ctx.fillText('🌱 農家の検定シリーズ — いちじく・桃農家アツシ', W / 2, 1160);

    const link = document.createElement('a');
    link.download = `shun-kentei_偏差値${deviation}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// ============================================================
// AUTHOR DRAWER
// ============================================================
const authorToggle  = $('author-toggle');
const authorDrawer  = $('author-drawer');
const authorOverlay = $('author-overlay');

function toggleAuthorDrawer() {
    const opening = authorDrawer.classList.contains('hidden');
    authorDrawer.classList.toggle('hidden');
    authorOverlay.classList.toggle('hidden');
    authorToggle.setAttribute('aria-expanded', opening);
}

authorToggle.addEventListener('click', toggleAuthorDrawer);
authorOverlay.addEventListener('click', toggleAuthorDrawer);

document.addEventListener('click', e => {
    if (!authorDrawer.classList.contains('hidden')
        && !authorDrawer.contains(e.target)
        && e.target !== authorToggle
        && e.target !== authorOverlay) {
        toggleAuthorDrawer();
    }
});

// ============================================================
// INIT
// ============================================================
initTheme();
showScreen('start');
