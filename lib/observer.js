// VLM 观察器：LanguageModel 会话 + report_world_observation toolcall。
// VLM 只输出结构化观察；权威状态在 lib/world.js。

import { LanguageModel } from 'language-model';

export const OBSERVER_TOOL_NAME = 'report_world_observation';

const OBSERVER_SYSTEM_PROMPT = [
  '你是 World Patch 的视觉验证器。你会收到一张俯视桌面的照片和一组目标条件。',
  '对每个条件输出一条观察：',
  '- status: satisfied（条件成立）/ violated（未成立或被违反）/ unverifiable（看不清、无法判断）',
  '- confidence: 0 到 1 的小数',
  '- evidence: 一句中文描述你看到的物理事实',
  '规则：',
  '1. 只报告可观察的物理事实，不提供动作建议，不闲聊。',
  '2. 光线不足、物体被遮挡或无法判断时，必须回答 unverifiable，不要猜。',
  '3. 必须调用 report_world_observation 工具一次性返回全部条件的观察。',
].join('\n');

export function buildObserverTool(goal) {
  return {
    type: 'function',
    function: {
      name: OBSERVER_TOOL_NAME,
      description: '评估照片中各目标条件的状态。只报告可观察证据，不提供动作建议。',
      parameters: {
        type: 'object',
        properties: {
          observations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                condition_id: { type: 'string', enum: goal.conditions.map((c) => c.id) },
                status: { type: 'string', enum: ['satisfied', 'violated', 'unverifiable'] },
                confidence: { type: 'number' },
                evidence: { type: 'string' },
              },
              required: ['condition_id', 'status', 'confidence', 'evidence'],
            },
          },
        },
        required: ['observations'],
      },
    },
  };
}

function buildConditionSummary(goal) {
  return goal.conditions.map((c, i) => `${i + 1}. [${c.id}] ${c.vlmDescription}`).join('\n');
}

function withTimeout(promise, ms, code) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject({ code, message: '观察请求超时' }), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

export async function createObserver({ goal, timeoutMs = 45000 }) {
  const availability = await LanguageModel.availability();
  if (availability !== 'available') {
    throw { code: 'LM_UNAVAILABLE', message: 'LanguageModel 当前不可用' };
  }

  const session = await LanguageModel.create({
    initialPrompts: [
      { role: 'system', content: OBSERVER_SYSTEM_PROMPT },
    ],
    tools: [buildObserverTool(goal)],
  });

  let queue = Promise.resolve();
  let latestToolcall = null;

  session.addEventListener('toolcall', (event) => {
    if (event && event.functionName === OBSERVER_TOOL_NAME && event.arguments) {
      latestToolcall = event.arguments;
    }
  });

  async function runObservation(dataUrl) {
    latestToolcall = null;
    const parts = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: '评估以下全部目标条件在照片中的状态：\n' + buildConditionSummary(goal),
          },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ];

    await withTimeout(session.prompt(parts), timeoutMs, 'TIMEOUT');

    if (!latestToolcall || !Array.isArray(latestToolcall.observations)) {
      throw { code: 'NO_TOOLCALL', message: '模型未返回结构化观察' };
    }
    return latestToolcall.observations;
  }

  return {
    // 文档限制：同一会话同一时间只允许一个活跃请求 → 串行队列。
    observe(dataUrl) {
      const run = queue.then(() => runObservation(dataUrl), () => runObservation(dataUrl));
      queue = run.catch(() => {});
      return run;
    },
    destroy() {
      try {
        session.destroy();
      } catch (e) {
        // 销毁失败不阻塞页面生命周期。
      }
    },
  };
}
