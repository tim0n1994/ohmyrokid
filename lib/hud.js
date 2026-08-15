// HUD 视图模型：把 (phase, world) 映射成单绿四态界面。纯函数。

function pad2(n) {
  return String(n).padStart(2, '0');
}

// phase ∈ IDLE | BRIEF | ACTIVE | VERIFYING | VERIFIED | FEEDBACK | CONFLICT | READY | ERROR
export function hudView({ phase, goal, world, condition, conflict, feedback, error }) {
  const base = {
    frame: 'idle',
    eyebrow: 'WORLD PATCH',
    progressText: '',
    glyph: '···',
    title: '',
    line1: '',
    line2: '',
    hint: 'ENTER 继续 · BACK 退出',
  };

  if (phase === 'IDLE') {
    return { ...base, title: 'SCANNING ···', line1: '现实补丁已就绪', line2: '按 ENTER 编译目标状态' };
  }

  if (!goal) return base;

  const total = goal.conditions.length;
  let done = 0;
  if (world) {
    for (const c of goal.conditions) {
      if (world.conditions[c.id].status === 'satisfied') done += 1;
    }
  }
  const progressText = `PATCH ${pad2(done)}/${pad2(total)}`;

  switch (phase) {
    case 'BRIEF':
      return {
        ...base,
        frame: 'active',
        progressText,
        title: 'TARGET',
        line1: goal.goalText,
        line2: `已编译 ${total} 个目标条件`,
        hint: 'ENTER 开始执行',
      };

    case 'ACTIVE': {
      if (!condition) return { ...base, frame: 'active', progressText, title: 'READY', line1: '全部条件满足' };
      const idx = goal.conditions.findIndex((c) => c.id === condition.id) + 1;
      return {
        ...base,
        frame: 'active',
        progressText,
        glyph: '»',
        title: `NEXT ${pad2(idx)}/${pad2(total)}`,
        line1: condition.instruction,
        line2: condition.vlmDescription,
        hint: '完成后按 ENTER 拍照验证',
      };
    }

    case 'VERIFYING':
      return {
        ...base,
        frame: 'verify',
        progressText,
        glyph: '···',
        title: 'VERIFY',
        line1: '正在观察桌面状态',
        line2: '保持视线对准演示区',
        hint: '验证中，请稍候',
      };

    case 'VERIFIED':
      return {
        ...base,
        frame: 'verified',
        progressText,
        glyph: '✓',
        title: 'VERIFIED',
        line1: condition ? condition.instruction : '',
        line2: '条件已满足',
        hint: 'ENTER 继续',
      };

    case 'FEEDBACK':
      return {
        ...base,
        frame: 'conflict',
        progressText,
        glyph: '△',
        title: 'NOT YET',
        line1: (feedback && feedback.line1) || '条件尚未满足',
        line2: (feedback && feedback.line2) || '调整后可重新验证',
        hint: 'ENTER 重新验证',
      };

    case 'CONFLICT':
      return {
        ...base,
        frame: 'conflict',
        progressText,
        glyph: '△',
        title: 'CONFLICT',
        line1: conflict ? `期望: ${conflict.expected}` : '已满足的条件被破坏',
        line2: conflict ? `实际: ${conflict.observed}` : '',
        hint: '修正后按 ENTER 重新验证',
      };

    case 'READY':
      return {
        ...base,
        frame: 'ready',
        progressText,
        glyph: '●',
        title: 'DEMO READY',
        line1: '全部目标条件已满足',
        line2: 'W* == W_t',
        hint: 'ENTER 重新开始',
      };

    case 'ERROR':
      return {
        ...base,
        frame: 'conflict',
        progressText,
        glyph: '△',
        title: 'ERROR',
        line1: (error && error.line1) || '验证链路异常',
        line2: (error && error.line2) || '按 ENTER 重试',
        hint: 'ENTER 重试 · BACK 退出',
      };

    default:
      return base;
  }
}
