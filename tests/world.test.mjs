// 本地可测部分：world 状态机纯逻辑 + hud 视图模型 + index.ink 结构。
// 运行：node tests/world.test.mjs（在 world-patch 目录下）

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { DEMO_READY_V1, getGoal, findCondition } from '../lib/goals.js';
import {
  createWorld, applyObservation, nextCondition, progress, isReady,
} from '../lib/world.js';
import { hudView } from '../lib/hud.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function obs(id, status, confidence = 0.9, evidence = '测试证据') {
  return { condition_id: id, status, confidence, evidence };
}

// 1. 初始状态
{
  const goal = DEMO_READY_V1;
  const w = createWorld(goal);
  assert.equal(nextCondition(w, goal).id, 'c1_product_centered');
  assert.deepEqual(progress(w, goal), { done: 0, total: 4 });
  assert.equal(isReady(w, goal), false);
  assert.equal(getGoal('demo_ready_v1'), goal);
  assert.equal(getGoal('nope'), null);
  assert.equal(findCondition(goal, 'c3_laptop_open').predicate, 'open');
}

// 2. 单条满足 → 前进到下一条件
{
  const goal = DEMO_READY_V1;
  let w = createWorld(goal);
  const r = applyObservation(w, goal, [obs('c1_product_centered', 'satisfied')]);
  assert.deepEqual(r.events.newlyVerified, ['c1_product_centered']);
  assert.equal(r.events.conflicts.length, 0);
  assert.equal(nextCondition(r.world, goal).id, 'c2_phone_on_stand');
  assert.deepEqual(progress(r.world, goal), { done: 1, total: 4 });
}

// 3. 依次全部满足 → READY
{
  const goal = DEMO_READY_V1;
  let w = createWorld(goal);
  for (const c of goal.conditions) {
    w = applyObservation(w, goal, goal.conditions.map((x) => obs(x.id, x.id === c.id ? 'satisfied' : w.conditions[x.id].status === 'satisfied' ? 'satisfied' : 'violated'))).world;
  }
  assert.equal(isReady(w, goal), true);
  assert.equal(nextCondition(w, goal), null);
  assert.deepEqual(progress(w, goal), { done: 4, total: 4 });
}

// 4. 冲突：已满足 → 违反
{
  const goal = DEMO_READY_V1;
  let w = createWorld(goal);
  w = applyObservation(w, goal, [obs('c1_product_centered', 'satisfied')]).world;
  const r = applyObservation(w, goal, [obs('c1_product_centered', 'violated', 0.85, '产品被移到边缘')]);
  assert.equal(r.events.conflicts.length, 1);
  assert.equal(r.events.conflicts[0].conditionId, 'c1_product_centered');
  assert.equal(r.events.conflicts[0].observed, '产品被移到边缘');
  assert.equal(r.world.conditions.c1_product_centered.status, 'violated');
  assert.equal(r.world.conflicts.length, 1);
}

// 5. unverifiable 不推进
{
  const goal = DEMO_READY_V1;
  const w = createWorld(goal);
  const r = applyObservation(w, goal, [obs('c1_product_centered', 'unverifiable', 0.3)]);
  assert.deepEqual(r.events.unverifiable, ['c1_product_centered']);
  assert.equal(nextCondition(r.world, goal).id, 'c1_product_centered');
}

// 6. 未知 id / 非法 status 被忽略；confidence 截断
{
  const goal = DEMO_READY_V1;
  const w = createWorld(goal);
  const r = applyObservation(w, goal, [
    obs('c9_unknown', 'satisfied'),
    obs('c1_product_centered', 'weird_status'),
    obs('c2_phone_on_stand', 'satisfied', 1.7),
  ]);
  assert.deepEqual(r.events.ignored, ['c9_unknown', 'c1_product_centered']);
  assert.equal(r.world.conditions.c2_phone_on_stand.confidence, 1);
  assert.equal(r.world.conditions.c2_phone_on_stand.status, 'satisfied');
  const r2 = applyObservation(w, goal, [obs('c2_phone_on_stand', 'satisfied', 'abc')]);
  assert.equal(r2.world.conditions.c2_phone_on_stand.confidence, null);
}

// 7. 历史快照上限 20
{
  const goal = DEMO_READY_V1;
  let w = createWorld(goal);
  for (let i = 0; i < 30; i += 1) {
    w = applyObservation(w, goal, [obs('c1_product_centered', 'violated', 0.5)]).world;
  }
  assert.equal(w.history.length, 20);
  assert.equal(w.seq, 30);
}

// 8. HUD 视图模型
{
  const goal = DEMO_READY_V1;
  const w = createWorld(goal);
  const idle = hudView({ phase: 'IDLE' });
  assert.equal(idle.title, 'SCANNING ···');
  assert.equal(idle.frame, 'idle');

  const brief = hudView({ phase: 'BRIEF', goal, world: w });
  assert.equal(brief.title, 'TARGET');
  assert.equal(brief.progressText, 'PATCH 00/04');

  const active = hudView({ phase: 'ACTIVE', goal, world: w, condition: goal.conditions[0] });
  assert.equal(active.title, 'NEXT 01/04');
  assert.equal(active.frame, 'active');
  assert.ok(active.line1.includes('演示区'));

  const verifying = hudView({ phase: 'VERIFYING', goal, world: w });
  assert.equal(verifying.title, 'VERIFY');

  const verified = hudView({ phase: 'VERIFIED', goal, world: w, condition: goal.conditions[0] });
  assert.equal(verified.glyph, '✓');

  const conflict = hudView({
    phase: 'CONFLICT', goal, world: w,
    conflict: { expected: '演示区清空', observed: '手机在演示区' },
  });
  assert.equal(conflict.frame, 'conflict');
  assert.equal(conflict.line1, '期望: 演示区清空');
  assert.equal(conflict.line2, '实际: 手机在演示区');

  const ready = hudView({ phase: 'READY', goal, world: w });
  assert.equal(ready.title, 'DEMO READY');
  assert.equal(ready.glyph, '●');

  const errored = hudView({ phase: 'ERROR', goal, world: w, error: { line1: 'x', line2: 'y' } });
  assert.equal(errored.title, 'ERROR');

  const feedback = hudView({ phase: 'FEEDBACK', goal, world: w, feedback: { line1: 'a', line2: 'b' } });
  assert.equal(feedback.title, 'NOT YET');
}

// 9. index.ink 结构检查：def JSON 可解析、三段齐全、setup 脚本可编译
{
  const ink = readFileSync(join(root, 'pages/index/index.ink'), 'utf8');
  const defMatch = ink.match(/<script def>([\s\S]*?)<\/script>/);
  assert.ok(defMatch, '缺少 <script def> 段');
  const def = JSON.parse(defMatch[1]);
  assert.equal(def.navigationBarTitleText, 'World Patch');

  assert.ok(/<page>/.test(ink), '缺少 <page> 段');
  assert.ok(/<style>/.test(ink), '缺少 <style> 段');
  for (const binding of ['hud.frame', 'hud.title', 'hud.line1', 'hud.hint']) {
    assert.ok(ink.includes(`{{${binding}}}`), `缺少绑定 ${binding}`);
  }

  const setupMatch = ink.match(/<script setup>([\s\S]*?)<\/script>/);
  assert.ok(setupMatch, '缺少 <script setup> 段');
  const setup = setupMatch[1]
    .replace(/^import[^;]+;$/gm, '')
    .replace('export default', 'const __page =');
  new Function(setup); // 语法编译检查
}

console.log('ALL TESTS PASSED');
