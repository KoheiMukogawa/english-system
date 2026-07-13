import { readFileSync } from 'node:fs';

const path = new URL('./questions.json', import.meta.url);
let data;
try {
  data = JSON.parse(readFileSync(path, 'utf8'));
} catch (e) {
  console.error('JSON parse error:', e.message);
  process.exit(1);
}

const errs = [];
if (!Array.isArray(data)) errs.push('top-level は配列である必要があります');

const ids = new Set();
const TYPES = new Set([undefined, 'tr', 'en', 'essay']);
data.forEach((x, i) => {
  const at = `#${i}(id=${x && x.id})`;
  if (typeof x !== 'object' || x === null) { errs.push(`${at}: オブジェクトでない`); return; }
  if (typeof x.id !== 'number') errs.push(`${at}: id は数値`);
  if (ids.has(x.id)) errs.push(`${at}: id 重複`); else ids.add(x.id);
  for (const k of ['part', 'cat', 'q', 'a', 'e']) {
    if (typeof x[k] !== 'string' || !x[k].trim()) errs.push(`${at}: ${k} は非空文字列`);
  }
  if (!TYPES.has(x.type)) errs.push(`${at}: 未知の type=${x.type}`);
  if (x.type === undefined) {
    if (!Array.isArray(x.d) || x.d.length < 1) errs.push(`${at}: 四択には d(誤答配列, 長さ≥1) が必要`);
    else if (x.d.some(o => typeof o !== 'string' || !o.trim())) errs.push(`${at}: d の要素は非空文字列`);
    if (typeof x.a === 'string' && Array.isArray(x.d) && x.d.includes(x.a)) errs.push(`${at}: 正解 a が誤答 d に混入`);
  }
  if (x.type === 'essay') {
    if (x.kw !== undefined && (!Array.isArray(x.kw) || x.kw.some(w => typeof w !== 'string'))) errs.push(`${at}: kw は文字列配列`);
    if (x.limit !== undefined && typeof x.limit !== 'number') errs.push(`${at}: limit は数値`);
  }
  if (x.hint !== undefined && typeof x.hint !== 'string') errs.push(`${at}: hint は文字列`);
});

if (errs.length) { console.error('検証NG:\n' + errs.map(e => ' - ' + e).join('\n')); process.exit(1); }
console.log(`OK: ${data.length}件`);
