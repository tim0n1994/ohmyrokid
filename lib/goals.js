// 目标模板与谓词白名单。Hero Demo 走确定性模板，不走 LLM 编译。

export const PREDICATE_WHITELIST = Object.freeze([
  'present', 'absent', 'inside_zone', 'outside_zone',
  'left_of', 'right_of', 'centered', 'on', 'off',
  'open', 'closed', 'upright', 'flat', 'clear', 'occupied',
]);

// 演示道具的显示名。换道具只改这里。
const PRODUCT_NAME = '产品';

export const DEMO_READY_V1 = Object.freeze({
  goalId: 'demo_ready_v1',
  goalText: '把这里变成能开始路演的状态',
  productName: PRODUCT_NAME,
  conditions: Object.freeze([
    {
      id: 'c1_product_centered',
      predicate: 'centered',
      subject: PRODUCT_NAME,
      zone: 'stage',
      instruction: `把${PRODUCT_NAME}移到演示区中央`,
      vlmDescription: `${PRODUCT_NAME}位于桌面演示区（画面中部区域）的中央位置`,
    },
    {
      id: 'c2_phone_on_stand',
      predicate: 'on',
      subject: 'phone',
      reference: 'stand',
      instruction: '把手机放到支架上',
      vlmDescription: '手机立在支架上（而不是平放在桌面）',
    },
    {
      id: 'c3_laptop_open',
      predicate: 'open',
      subject: 'laptop',
      instruction: '把笔记本翻开到大于90度',
      vlmDescription: '笔记本电脑处于翻开状态，屏幕与键盘夹角大于90度',
    },
    {
      id: 'c4_stage_clear',
      predicate: 'clear',
      zone: 'stage',
      except: [PRODUCT_NAME],
      instruction: '清空演示区，只留' + PRODUCT_NAME,
      vlmDescription: `演示区（画面中部区域）内除${PRODUCT_NAME}外没有其他杂物`,
    },
  ]),
});

export function getGoal(goalId) {
  if (goalId === DEMO_READY_V1.goalId) return DEMO_READY_V1;
  return null;
}

export function findCondition(goal, conditionId) {
  return goal.conditions.find((c) => c.id === conditionId) || null;
}
