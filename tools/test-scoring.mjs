/**
 * Tests for the bench's evaluation/scoring logic.
 *
 * The scoring functions live inside `index.html`. Rather than duplicate them
 * (which would let the tests pass against a stale copy), this harness extracts
 * the real function bodies out of `index.html`, evaluates them, and asserts on
 * their behaviour. If someone changes the scoring rules without updating them
 * here, these tests still exercise the shipped code.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// Brace-match from a function's opening brace, ignoring braces that appear
// inside string / template literals, regex-ish literals and comments.
function extractFunction(name) {
  const start = html.indexOf(`function ${name}(`);
  if (start === -1) throw new Error(`Could not find function ${name}() in index.html`);
  const open = html.indexOf('{', start);
  let depth = 0;
  let quote = null;
  for (let i = open; i < html.length; i++) {
    const c = html[i];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '/' && html[i + 1] === '/') { i = html.indexOf('\n', i); continue; }
    if (c === '/' && html[i + 1] === '*') { i = html.indexOf('*/', i) + 1; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  throw new Error(`Unbalanced braces while extracting ${name}()`);
}

const src = ['scoreKeywords', 'extractJsonObject', 'scoreToolCall', 'aggregateScores'].map(extractFunction).join('\n');
const factory = new Function(`${src}\nreturn { scoreKeywords, extractJsonObject, scoreToolCall, aggregateScores };`);
const { scoreKeywords, extractJsonObject, scoreToolCall, aggregateScores } = factory();

let passed = 0;
let failed = 0;
function check(label, cond, extra = '') {
  if (cond) { passed++; console.log(`  ok   ${label}`); }
  else { failed++; console.log(`  FAIL ${label}${extra ? ' — ' + extra : ''}`); }
}
function eq(label, got, want) { check(label, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); }

console.log('\nscoreKeywords');
eq('all keywords present -> pass', scoreKeywords('A red square and a green triangle.', ['red', 'square', 'green']).tier, 'pass');
eq('some keywords present -> partial', scoreKeywords('A red square.', ['red', 'square', 'green']).tier, 'partial');
eq('no keywords present -> fail', scoreKeywords('A cat.', ['red', 'square', 'green']).tier, 'fail');
eq('matching is case-insensitive', scoreKeywords('RED SQUARE', ['red', 'square']).tier, 'pass');
eq('partial score is the fraction matched', scoreKeywords('red', ['red', 'blue']).score, 0.5);
eq('empty output fails rather than passing vacuously', scoreKeywords('', ['red']).tier, 'fail');

console.log('\nextractJsonObject');
eq('plain object', extractJsonObject('{"function":"a","arguments":{}}').function, 'a');
eq('object wrapped in prose', extractJsonObject('Sure! Here you go: {"function":"a"} — done').function, 'a');
eq('object inside a markdown fence', extractJsonObject('```json\n{"function":"a"}\n```').function, 'a');
eq('nested objects parse fully', extractJsonObject('{"a":{"b":1},"c":2}').a.b, 1);
eq('no JSON -> null', extractJsonObject('I cannot help with that.'), null);
eq('malformed JSON -> null', extractJsonObject('{"function": }'), null);

console.log('\nscoreToolCall');
const expected = '{"function":"set_lights","arguments":{"room":"kitchen","on":true}}';
eq('exact call -> pass', scoreToolCall('{"function":"set_lights","arguments":{"room":"kitchen","on":true}}', expected).tier, 'pass');
eq('right function, wrong args -> partial', scoreToolCall('{"function":"set_lights","arguments":{"room":"garage","on":true}}', expected).tier, 'partial');
eq('wrong function -> fail', scoreToolCall('{"function":"get_weather","arguments":{"city":"Paris"}}', expected).tier, 'fail');
eq('no JSON in output -> fail', scoreToolCall('I will turn on the lights.', expected).tier, 'fail');
eq('null function is a fail against a real expectation', scoreToolCall('{"function": null}', expected).tier, 'fail');
eq('prose-wrapped call still passes', scoreToolCall('Here: {"function":"set_lights","arguments":{"room":"kitchen","on":true}}', expected).tier, 'pass');
eq('expected array takes first element', scoreToolCall('{"function":"set_lights","arguments":{"room":"kitchen","on":true}}', '[{"function":"set_lights","arguments":{"room":"kitchen","on":true}}]').tier, 'pass');
eq('unparseable expectation -> fail', scoreToolCall('{"function":"a"}', 'not json').tier, 'fail');
eq('name/parameters aliases work', scoreToolCall('{"name":"set_lights","parameters":{"room":"kitchen","on":true}}', expected).tier, 'pass');
eq('extra model args do not break a pass', scoreToolCall('{"function":"set_lights","arguments":{"room":"kitchen","on":true,"brightness":50}}', expected).tier, 'pass');

console.log('\naggregateScores (prompt chaining)');
const turn = t => ({ tier: t, score: t === 'pass' ? 1 : t === 'partial' ? 0.5 : 0 });
eq('all turns pass -> pass', aggregateScores([turn('pass'), turn('pass')]).tier, 'pass');
eq('a mixed chain -> partial', aggregateScores([turn('pass'), turn('fail')]).tier, 'partial');
eq('all turns fail -> fail', aggregateScores([turn('fail')]).tier, 'fail');
eq('mean score averages the turns', aggregateScores([turn('pass'), turn('partial')]).score, 0.75);
eq('detail counts fully-passed turns', aggregateScores([turn('pass'), turn('partial'), turn('pass')]).detail, '2/3 turns passed');
eq('no graded turns -> null', aggregateScores([]), null);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
