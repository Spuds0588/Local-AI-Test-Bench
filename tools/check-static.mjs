/**
 * Static checks for the bench, runnable in CI without a browser or a GPU.
 *
 *  1. the inline app script parses as valid JavaScript
 *  2. HTML tags are balanced
 *  3. every element id referenced by `$('#id')` exists in the markup
 *  4. the MODELS registry is internally consistent (unique ids, valid engines,
 *     required per-engine fields, valid modes)
 *  5. every model repo referenced by the registry resolves on the Hugging Face
 *     Hub (network check; skipped with --offline)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const offline = process.argv.includes('--offline');

let passed = 0, failed = 0;
const check = (label, cond, extra = '') => {
  if (cond) { passed++; console.log(`  ok   ${label}`); }
  else { failed++; console.log(`  FAIL ${label}${extra ? ' — ' + extra : ''}`); }
};

// ---- 1. inline script syntax -------------------------------------------------
console.log('\nscript syntax');
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
check('exactly one inline script block', scripts.length === 1, `found ${scripts.length}`);
let scriptSrc = scripts[0] || '';
try { new Function(scriptSrc); check('inline script parses', true); }
catch (e) { check('inline script parses', false, e.message); }

// ---- 2. tag balance ----------------------------------------------------------
console.log('\nHTML structure');
const voidTags = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
// Only inspect real markup: script/style bodies legitimately contain things
// like the literal `<image>` token used in vision prompts.
const markup = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
const stack = [];
let imbalance = null;
for (const m of markup.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g)) {
  const [, close, tag, selfClose] = m;
  const t = tag.toLowerCase();
  if (voidTags.has(t) || selfClose === '/') continue;
  if (!close) stack.push(t);
  else {
    const top = stack.pop();
    if (top !== t) { imbalance = `</${t}> closed <${top}>`; break; }
  }
}
check('tags are balanced', !imbalance && stack.length === 0, imbalance || `unclosed: ${stack.join(', ')}`);

// ---- 3. referenced ids exist -------------------------------------------------
console.log('\nDOM wiring');
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
const referenced = new Set([...scriptSrc.matchAll(/\$\('#([a-zA-Z0-9_-]+)'\)/g)].map(m => m[1]));
const missing = [...referenced].filter(id => !ids.has(id));
check(`all ${referenced.size} $('#id') references exist in markup`, missing.length === 0, missing.join(', '));

// ---- 4. MODELS registry ------------------------------------------------------
console.log('\nMODELS registry');
const modStart = html.indexOf('const MODELS = [');
const modEnd = html.indexOf('\n    ];', modStart);
const modelsSrc = html.slice(modStart + 'const MODELS = '.length, modEnd + '\n    ]'.length);
let MODELS;
try { MODELS = new Function(`const MODELS = ${modelsSrc};\nreturn MODELS;`)(); check('registry evaluates', true); }
catch (e) { check('registry evaluates', false, e.message); MODELS = []; }

const ENGINES = ['builtin', 'needle', 'transformers', 'webllm', 'vision'];
check('registry is non-empty', MODELS.length > 0, `${MODELS.length} models`);
check('model ids are unique', new Set(MODELS.map(m => m.id)).size === MODELS.length);
check('every engine is known', MODELS.every(m => ENGINES.includes(m.engine)),
  [...new Set(MODELS.filter(m => !ENGINES.includes(m.engine)).map(m => m.engine))].join(', '));
check('every model has label/params/size', MODELS.every(m => m.label && m.params && m.size));
check('every model has at least one mode', MODELS.every(m => Array.isArray(m.modes) && m.modes.length));
check('modes are from the known set', MODELS.every(m => m.modes.every(x => ['chat', 'tool', 'vision'].includes(x))));
check('transformers/vision models have a repo', MODELS.filter(m => m.engine === 'transformers' || m.engine === 'vision').every(m => m.repo));
check('webllm models have a wlId', MODELS.filter(m => m.engine === 'webllm').every(m => m.wlId));
check('vision models declare dtype and order',
  MODELS.filter(m => m.engine === 'vision').every(m => m.dtype && ['text-image', 'image-text'].includes(m.order)));
const vision = MODELS.filter(m => m.engine === 'vision');
check('vision engine is represented', vision.length > 0, `${vision.length} vision models`);
console.log(`       vision models: ${vision.map(m => `${m.label} (${m.params}, ${m.size})`).join(', ')}`);

// ---- 4b. CAPABILITIES registry -------------------------------------------------
console.log('\nCAPABILITIES registry');
const capStart = html.indexOf('const CAPABILITIES = {');
const capEnd = html.indexOf('\n    };', capStart);
// Keep the leading `const CAPABILITIES =` so the slice is an assignment (a bare
// `{…}` would parse as a block, not an object literal).
const capSrc = html.slice(capStart, capEnd + '\n    }'.length) + ';';
const orderStart = html.indexOf('const CAPABILITY_ORDER =', capStart);
const orderSrc = html.slice(orderStart, html.indexOf(';', orderStart) + 1);
let CAPABILITIES, CAPABILITY_ORDER;
try {
  ({ CAPABILITIES, CAPABILITY_ORDER } = new Function(`${capSrc}\n${orderSrc}\nreturn { CAPABILITIES, CAPABILITY_ORDER };`)());
  check('capability registry evaluates', true);
} catch (e) { check('capability registry evaluates', false, e.message); CAPABILITIES = {}; CAPABILITY_ORDER = []; }
const capKeys = Object.keys(CAPABILITIES);
check('capability order matches the registry', CAPABILITY_ORDER.length === capKeys.length && CAPABILITY_ORDER.every(k => k in CAPABILITIES),
  `order=[${CAPABILITY_ORDER}] keys=[${capKeys}]`);
check('every capability has icon/name/blurb', capKeys.every(k => CAPABILITIES[k].icon && CAPABILITIES[k].name && CAPABILITIES[k].blurb));
check('every model mode maps to a capability', MODELS.every(m => m.modes.every(x => x in CAPABILITIES)),
  [...new Set(MODELS.flatMap(m => m.modes).filter(x => !(x in CAPABILITIES)))].join(', '));
// A capability may be *derived* from another model mode via `derivedFrom`
// (prompt chaining drives chat models rather than being a modality of its own).
// Either way it must resolve to at least one model and point at a real key.
const capMode = k => (CAPABILITIES[k] && CAPABILITIES[k].derivedFrom) || k;
check('every capability resolves to at least one model',
  CAPABILITY_ORDER.every(k => MODELS.some(m => m.modes.includes(capMode(k)))),
  CAPABILITY_ORDER.filter(k => !MODELS.some(m => m.modes.includes(capMode(k)))).join(', '));
check('derived capabilities reference a real capability',
  CAPABILITY_ORDER.every(k => !CAPABILITIES[k].derivedFrom || CAPABILITIES[k].derivedFrom in CAPABILITIES),
  CAPABILITY_ORDER.filter(k => CAPABILITIES[k].derivedFrom && !(CAPABILITIES[k].derivedFrom in CAPABILITIES)).join(', '));
const capPanels = CAPABILITY_ORDER.map(k => CAPABILITIES[k].panel).filter(Boolean);
check('capability panel selectors exist in markup', capPanels.every(sel => ids.has(sel.slice(1))), capPanels.join(', '));
check('primary capability is defined for every model',
  MODELS.every(m => CAPABILITY_ORDER.find(c => m.modes.includes(c))),
  MODELS.filter(m => !CAPABILITY_ORDER.find(c => m.modes.includes(c))).map(m => m.id).join(', '));

// ---- 5. Hub reachability -----------------------------------------------------
console.log('\nHugging Face repo reachability');
if (offline) {
  console.log('  skip (--offline)');
} else {
  const repos = [...new Set(MODELS.filter(m => m.repo).map(m => m.repo))];
  for (const repo of repos) {
    const res = await fetch(`https://huggingface.co/api/models/${repo}`, { method: 'GET' });
    check(`repo resolves: ${repo}`, res.ok, `HTTP ${res.status}`);
  }
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
