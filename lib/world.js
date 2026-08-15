// W_t 权威世界状态 + Diff Engine + 冲突检测。纯函数，无平台依赖。

export const STATUS = {
  PENDING: 'pending',
  SATISFIED: 'satisfied',
  VIOLATED: 'violated',
  UNVERIFIABLE: 'unverifiable',
};

const VALID_STATUSES = new Set([STATUS.PENDING, STATUS.SATISFIED, STATUS.VIOLATED, STATUS.UNVERIFIABLE]);
const HISTORY_LIMIT = 20;

function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  return Math.min(1, Math.max(0, x));
}

export function createWorld(goal) {
  const conditions = {};
  for (const c of goal.conditions) {
    conditions[c.id] = {
      status: STATUS.PENDING,
      confidence: null,
      evidence: null,
      updatedAt: 0,
    };
  }
  return {
    goalId: goal.goalId,
    seq: 0,
    conditions,
    history: [],
    conflicts: [],
  };
}

function snapshot(world) {
  return {
    seq: world.seq,
    conditions: JSON.parse(JSON.stringify(world.conditions)),
  };
}

// observations: [{ condition_id, status, confidence, evidence }]
// 返回 { world, events: { newlyVerified, conflicts, unverifiable, ignored } }
export function applyObservation(world, goal, observations) {
  if (!Array.isArray(observations)) observations = [];
  const known = new Map(goal.conditions.map((c) => [c.id, c]));

  const next = {
    ...world,
    seq: world.seq + 1,
    conditions: JSON.parse(JSON.stringify(world.conditions)),
  };

  const newlyVerified = [];
  const conflicts = [];
  const unverifiable = [];
  const ignored = [];

  for (const obs of observations) {
    const cond = known.get(obs && obs.condition_id);
    if (!cond) {
      ignored.push(obs && obs.condition_id);
      continue;
    }
    const status = obs.status;
    if (!VALID_STATUSES.has(status)) {
      ignored.push(obs.condition_id);
      continue;
    }
    const prev = world.conditions[cond.id];

    // 冲突定义：曾经验证满足的条件，现在被观察到违反。
    if (prev.status === STATUS.SATISFIED && status === STATUS.VIOLATED) {
      conflicts.push({
        conditionId: cond.id,
        expected: cond.vlmDescription,
        observed: String(obs.evidence || '').slice(0, 80) || '观察到与目标不符',
        at: next.seq,
      });
    }

    if (status === STATUS.SATISFIED && prev.status !== STATUS.SATISFIED) {
      newlyVerified.push(cond.id);
    }
    if (status === STATUS.UNVERIFIABLE) {
      unverifiable.push(cond.id);
    }

    next.conditions[cond.id] = {
      status,
      confidence: clamp01(obs.confidence),
      evidence: String(obs.evidence || '').slice(0, 80) || null,
      updatedAt: next.seq,
    };
  }

  next.history = [...world.history, snapshot(world)].slice(-HISTORY_LIMIT);
  next.conflicts = [...world.conflicts, ...conflicts];

  return {
    world: next,
    events: { newlyVerified, conflicts, unverifiable, ignored },
  };
}

// Diff Engine：取第一个未满足的条件作为下一个动作。
export function nextCondition(world, goal) {
  for (const c of goal.conditions) {
    if (world.conditions[c.id].status !== STATUS.SATISFIED) return c;
  }
  return null;
}

export function progress(world, goal) {
  const done = goal.conditions.filter((c) => world.conditions[c.id].status === STATUS.SATISFIED).length;
  return { done, total: goal.conditions.length };
}

export function isReady(world, goal) {
  return nextCondition(world, goal) === null;
}
