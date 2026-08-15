# World Patch R2 方案讨论稿

状态：**待用户审批**。本文档是实现前的设计讨论稿，批准前不写任何应用代码。

上游策略见 [STRATEGY.md](./STRATEGY.md)。本文档把它落成可实现的工程规格。

---

## 0. 一句话

用户说「把这里变成能开始路演的状态」→ 系统编译出 4 个目标条件 → 逐个引导用户执行 → 按键拍照验证 → 故意做错触发冲突 → 系统发现并重规划 → DEMO READY。

## 1. Hero Demo 桌面布局（60×40cm）

```
┌──────────────────────────────────────────────────────┐
│                        60cm                           │
│  ┌─────────┐          ┌────────┐      ┌───────────┐  │
│  │ 杂物区   │          │ MacBook │      │ 手机+支架  │  │
│  │ (初始:   │   40cm   │ (初始:  │      │ (初始:    │  │
│  │  散落)   │          │  合盖)  │      │  平放)    │  │
│  └─────────┘          └────────┘      └───────────┘  │
│                                                      │
│            ┌────────────────────────┐                │
│            │   演示区 (STAGE)        │                │
│            │   product 初始: 偏移    │                │
│            │   目标: 居中            │                │
│            └────────────────────────┘                │
└──────────────────────────────────────────────────────┘
```

道具清单（6 件）：产品本体、手机、手机支架、MacBook、Hub+线（杂物）、咖啡杯（杂物）。

初始状态：产品偏在演示区一侧；手机平放未上支架；MacBook 合盖；杂物散落在演示区。

## 2. 目标谓词 Schema（demo_ready_v1）

Target Compiler 的确定性模板输出。Hero Demo 走模板，不走 LLM 编译。

```json
{
  "goal_id": "demo_ready_v1",
  "goal_text": "把这里变成能开始路演的状态",
  "conditions": [
    {
      "id": "c1_product_centered",
      "predicate": "centered",
      "subject": "product",
      "zone": "stage",
      "instruction": "把产品移到演示区中央"
    },
    {
      "id": "c2_phone_on_stand",
      "predicate": "on",
      "subject": "phone",
      "reference": "stand",
      "instruction": "把手机放到支架上"
    },
    {
      "id": "c3_laptop_open",
      "predicate": "open",
      "subject": "laptop",
      "instruction": "把笔记本翻开到大于90度"
    },
    {
      "id": "c4_stage_clear",
      "predicate": "clear",
      "zone": "stage",
      "except": ["product"],
      "instruction": "清空演示区，只留产品"
    }
  ]
}
```

谓词白名单（冻结，不扩展）：`present / absent / inside_zone / outside_zone / left_of / right_of / centered / on / off / open / closed / upright / flat / clear / occupied`。

## 3. VLM Tool Call 定义

会话创建时声明唯一工具 `report_world_observation`。VLM 只输出观察，不输出建议、不输出闲聊。

```js
const session = await LanguageModel.create({
  initialPrompts: [
    { role: 'system', content: OBSERVER_SYSTEM_PROMPT }
  ],
  tools: [REPORT_WORLD_OBSERVATION]
});
```

```js
const REPORT_WORLD_OBSERVATION = {
  type: 'function',
  function: {
    name: 'report_world_observation',
    description: '评估照片中各目标条件的状态。只报告可观察证据，不提供动作建议。',
    parameters: {
      type: 'object',
      properties: {
        observations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              condition_id: { type: 'string', enum: ['c1_product_centered','c2_phone_on_stand','c3_laptop_open','c4_stage_clear'] },
              status: { type: 'string', enum: ['satisfied','violated','unverifiable'] },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              evidence: { type: 'string' }
            },
            required: ['condition_id','status','confidence','evidence']
          }
        }
      },
      required: ['observations']
    }
  }
};
```

System prompt 核心约束（草稿）：你是视觉验证器。对每个 condition_id 给出 satisfied / violated / unverifiable。看不清或光照不足时必须回答 unverifiable 而不是猜。evidence 用一句中文描述你看到的物理事实。

多模态输入格式（官方样例已验证的链路）：

```js
// takePhoto → { data: ArrayBuffer, mimeType: 'image/webp' }
const dataUrl = `data:${photo.mimeType};base64,${wx.arrayBufferToBase64(photo.data)}`;
const result = await session.prompt([
  { role: 'user', content: [
      { type: 'text', text: goalConditionSummary },
      { type: 'image_url', image_url: { url: dataUrl } }
  ]}
]);
// 结构化结果从 session 'toolcall' 事件的 event.arguments 取
```

## 4. 本地状态机（权威状态在本地，不在 VLM）

```
                 ┌──────────────────────────────────────┐
                 │                                      │
  IDLE ──► COMPILED ──► ACTIVE ──► VERIFYING ──►┬─ VERIFIED ──► (下一个条件) ──► READY
  (语音唤醒)  (模板编译)   (NEXT指令)  (Enter→takePhoto) │
                                                 ├─ CONFLICT ──► 重规划 ──► ACTIVE
                                                 └─ UNVERIFIABLE ──► 降级路径
```

**W_t（权威世界状态）**——本地纯数据结构：

```js
// state/world.js 维护
{
  goal: demo_ready_v1,
  conditions: {
    'c1_product_centered': { status: 'satisfied', confidence: 0.92, evidence: '...', updatedAt: 3 },
    'c2_phone_on_stand':   { status: 'pending',   confidence: null,  evidence: null, updatedAt: 0 },
    ...
  },
  history: [ /* 每次观察的不可变快照，供 rollback */ ],
  conflicts: []
}
```

**Diff Engine**（纯函数）：`nextAction(W_t, W*) → instruction | READY`。取第一个未满足条件生成 NEXT 指令；全部满足输出 DEMO READY。

**冲突检测**（纯函数）：新观察进来时，任何曾为 `satisfied` 的条件变为 `violated` → 生成 CONFLICT 事件（含 expected vs observed 对比文案）。

**会话串行化**：同一 LanguageModelSession 同时只允许一个活跃请求（文档明确限制），所有 VLM 调用走单队列。

## 5. 90 秒演示脚本

| 时间 | 用户/系统 | 动作 | HUD |
|---|---|---|---|
| 0:00 | 用户 | 「把这里变成能开始路演的状态」 | OBSERVE · SCANNING |
| 0:05 | 系统 | 编译出 4 目标条件 | NEXT 01/04 产品居中 |
| 0:10 | 用户 | 移动产品 | VERIFY ··· |
| 0:15 | 用户 | 按 Enter 拍照 | ✓ VERIFIED |
| 0:20 | 系统 | 进入下一条件 | NEXT 02/04 手机上支架 |
| 0:25 | 用户 | 放手机上支架 → Enter | ✓ VERIFIED |
| 0:35 | 系统 | | NEXT 03/04 笔记本翻开 |
| 0:40 | 用户 | 翻开笔记本 → Enter | ✓ VERIFIED |
| 0:45 | 系统 | | NEXT 04/04 清空演示区 |
| 0:50 | 用户 | 收走杂物 → Enter | ✓ VERIFIED |
| 0:55 | 系统 | **故意做错**：把手机扔进演示区 → Enter | △ CONFLICT |
| 1:05 | 系统 | Expected: stage clear / Observed: phone in stage | NEXT 修正指令 |
| 1:15 | 用户 | 移走手机 → Enter | ✓ DEMO READY |
| 1:20 | 系统 | 全部条件满足 | ● READY |

多模态调用预算：整场 ≤ 7 次（4 次正常验证 + 1 次冲突 + 1 次修正 + 1 次余量）。

## 6. 风险与降级

| 风险 | 概率 | 降级路径 |
|---|---|---|
| VLM 不可用/超时（蓝牙代理网络） | 高 | barcode 锚点模式：道具贴二维码，scanner 样例的 BarcodeDetector 本地识别，离线可用 |
| VLM 置信度 < 0.6 | 中 | HUD 显示「请调整角度再拍一次」；连续 2 次低置信 → nod/shake 人工确认 |
| 状态误判（满足变违反的假阳性） | 中 | 冲突确认前显示证据文案，用户可 Enter 确认 / Backspace 忽略 |
| takePhoto 必须交互触发 | 已是设计 | 事件驱动本来就是架构原则，不是缺陷 |
| LanguageModel 会话并发限制 | 低 | 单队列串行化（第 4 节） |
| 眼镜蓝牙断网 | 中 | barcode 模式全程离线可跑（P1 之前实现 barcode 通路作为保险） |

**P0/P1 边界**：P0 = VLM 主通路 + 四态 HUD + 状态机 + 冲突检测。P1 = barcode 降级通路、nod/shake 确认、rollback、judge console。P0 内先实现 VLM 主通路，但 demo 前必须验证 barcode 通路存在（哪怕只贴一张码验证链路通）。

## 7. 文件结构（批准后实现）

```
world-patch/
  pages/index/index.ink      # HUD 四态渲染 + 按键事件
  lib/goals.js               # demo_ready_v1 模板 + 谓词白名单
  lib/observer.js            # LanguageModel 会话管理 + toolcall 解析
  lib/camera.js              # takePhoto → data URL 封装
  lib/world.js               # W_t 权威状态 + Diff Engine + 冲突检测（纯函数）
  lib/hud.js                 # 四态文案与单绿样式 token
```

## 8. 待用户决策的点

1. **道具确认**：你手边的「产品」用什么代替？（演示时需要一个可识别的主体物件）
2. **barcode 保底**：是否接受在道具上贴二维码作为离线降级（Demo 视觉上会多一张小贴纸）？
3. **语音入口**：「把这里变成能开始路演的状态」用真语音唤醒，还是按键进入演示模式（现场噪音可控性 vs 惊艳度）？
4. **P0 验收标准**：我建议 = 真机上 90 秒脚本完整跑通 + 故意做错必现 CONFLICT。是否同意？

## 9. 决策已锁定（2026-08-15，用户委托默认项）

用户回复「接下来就看你的了，帮我搞定」，按预先公示的默认项锁定：

1. **道具**：产品 = 任意高辨识度桌面物件（默认「产品盒」；名称集中在 `lib/goals.js` 一处配置，改一个字符串即可换道具）。
2. **barcode 保底**：接受贴码方案，实现排在 P1（VLM 主通路优先，demo 前验证链路存在）。
3. **入口**：P0 用按键（Enter）进入演示流程，稳定可控；语音唤醒词保留在 AGENTS.md 作为智能体入口。
4. **P0 验收**：真机 90 秒脚本完整跑通 + 故意做错必现 CONFLICT。
