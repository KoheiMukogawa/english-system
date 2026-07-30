// 問題一覧（記述問題）の並び替えロジックの回帰テスト。
// index.html から純粋関数だけを取り出して questions.json に対して実行する。
// 使い方: node test-list.mjs
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const DATA = JSON.parse(readFileSync(new URL('./questions.json', import.meta.url), 'utf8'));

function grab(name) {
  const start = html.indexOf('function ' + name + '(');
  if (start < 0) throw new Error(`関数 ${name} が index.html に見つかりません`);
  let depth = 0;
  for (let j = html.indexOf('{', start); j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}' && --depth === 0) return html.slice(start, j + 1);
  }
  throw new Error(`関数 ${name} の終端が見つかりません`);
}
function grabVar(name) {
  const m = html.match(new RegExp('^var ' + name + '=[\\s\\S]*?;$', 'm'));
  if (!m) throw new Error(`変数 ${name} が index.html に見つかりません`);
  return m[0];
}

const src = [grabVar('WGENRES'), grab('activeData'), grab('genreList')].join('\n');
const load = new Function('DATA', 'HIDE', src + '\nreturn {WGENRES:WGENRES,genreList:genreList};');
const { WGENRES, genreList } = load(DATA, {});

const errs = [];
const ok = (cond, msg) => { if (!cond) errs.push(msg); };
const countType = (t) => DATA.filter((x) => x.type === t).length;

// 1. 記述3種すべてがジャンル定義に載っている
const genreTypes = WGENRES.map((g) => g[0]);
for (const t of ['tr', 'en', 'essay']) {
  ok(genreTypes.includes(t), `WGENRES に type=${t} のジャンルがない（一覧に出せない）`);
}

// 2. 各ジャンルの一覧が questions.json の全件を拾えている
for (const t of ['tr', 'en', 'essay']) {
  const n = countType(t);
  ok(n > 0, `questions.json に type=${t} の問題がない（テストの前提が崩れている）`);
  const list = genreTypes.includes(t) ? genreList(t) : [];
  ok(list.length === n, `type=${t} の一覧が ${list.length}件（期待 ${n}件）`);
  ok(list.every((x) => x.type === t), `type=${t} の一覧に他ジャンルが混入`);
}

// 3. 記述問題（四択以外）がどのジャンルにも漏れなく入っている
const shown = new Set(genreTypes.flatMap((t) => genreList(t).map((x) => x.id)));
for (const x of DATA) {
  if (x.type === undefined) continue;
  ok(shown.has(x.id), `id=${x.id}(type=${x.type}) がどの一覧にも表示されない`);
}

// 4. 同じ cat が一覧内で連続している（見出しが重複表示されない）
for (const t of genreTypes) {
  const cats = genreList(t).map((x) => x.cat);
  const seen = [];
  for (let i = 0; i < cats.length; i++) {
    if (i && cats[i] === cats[i - 1]) continue;
    ok(!seen.includes(cats[i]), `type=${t}: cat「${cats[i]}」が一覧内で分断され見出しが2回出る`);
    seen.push(cats[i]);
  }
}

// 5. 卒業（HIDE）した問題は一覧から消える
const first = DATA.find((x) => x.type === 'en');
if (first) {
  const { genreList: gl2 } = load(DATA, { [first.id]: 1 });
  ok(gl2('en').length === countType('en') - 1, '卒業した問題が英作文の一覧から消えていない');
}

if (errs.length) {
  console.error('検証NG:\n' + errs.map((e) => ' - ' + e).join('\n'));
  process.exit(1);
}
console.log(`OK: ${genreTypes.map((t) => t + '=' + genreList(t).length + '件').join(' / ')}`);
