# World Patch 夺冠策略（执行摘要）

来源：ChatGPT 会话「Rokid黑客松策略建议」（2026-08-15 读回）。

## 定位

**WORLD PATCH / 现实补丁 — A compiler for reality.**

不是「眼镜上的 ChatGPT」（看东西→拍照→回答），而是 Stateful Reality Agent：
维护一个随观察演化的物理世界状态 W_t，给定目标状态 W*，计算差异并驱动现实向目标收敛。

底层引擎：StateLens（See → Remember → Predict → Act → Verify）。
技术核心：**Goal-Conditioned Visual State Machine**。

## 必须证明的三件事

1. **TARGET** — 自然语言意图被编译成结构化目标条件
2. **STATE CHANGE** — 连续观察产生真实的状态转移（不是单帧 VQA）
3. **CONFLICT RECOVERY** — 故意做错时系统能发现 Expected ≠ Observed 并重规划

## Hero Demo（冻结主线）

桌面 60×40cm 区域，道具：MacBook、手机、支架、产品、Hub、线、杂物。

说：「把这里变成能开始路演的状态。」

编译出 4 个目标条件：

1. Product centered（产品居中）
2. Phone on stand（手机上支架）
3. Laptop open（笔记本翻开）
4. Demo zone clear（演示区清空）

流程：NEXT → 动手 → 按键验证 → ✓ VERIFIED → 下一步 → **故意做错**（手机放到演示区）→ △ CONFLICT → 重规划 → 修正 → DEMO READY。

## 关键架构决策

- **事件驱动感知**：不做连续视频。用户完成动作 → 按眼镜键（Enter）→ takePhoto → 验证。对应 W_t → a → W_{t+1}。
- **LLM 只做观察，不做状态仓库**：VLM 输出结构化观察（report_world_observation tool call：condition_id/status/confidence/evidence），本地确定性 State Reducer + Diff Engine 才是权威状态。
- **Target-conditioned Vision**：不问「描述图片」，只问「这 4 个目标条件是否成立」。P(c_i | image)。
- **两级 Target Compiler**：已知意图（路演模式）→ 确定性模板 demo_ready_v1；开放意图 → LLM 编译。
- **谓词白名单**：present/absent, inside_zone/outside_zone, left_of/right_of/centered, on/off, open/closed, upright/flat, clear/occupied。不做通用现实本体。
- **重要性门控**：I_t = f(goal relevance, state delta, risk, uncertainty) > τ 才打扰用户。其余时候安静。
- **混合识别保险**：VLM 置信度低时降级到 QR/barcode 锚点（官方 scanner 样例已验证）+ nod/shake 确认。Uncertainty is part of the UX。

## HUD（单绿设计系统）

只做四态，无 Chat UI、无菜单、无 dashboard：

| 态 | 显示 |
|---|---|
| OBSERVE | SCANNING ··· |
| NEXT | PATCH 02/04 + 一个动作 |
| VERIFY | ✓ VERIFIED |
| CONFLICT | △ Expected vs Observed + 一个修正动作 |

错误不用红色（单绿屏），用 △ 边框/虚线/闪烁/opacity 表达。

## 调用预算

网络路径眼镜→蓝牙→手机→互联网。整个 Demo ≤5 次多模态调用：
Call1 目标+首观察；Call2-5 逐步验证。

## P0 / P1 / Kill List

**P0**：intent → initial observation → target → patch → verify → next → conflict → replan → complete

**P1**：head gesture（nod/shake）、barcode 混合识别、rollback（Git for Reality 叙事）、judge console（MacBook WebSocket 状态展示，非 Hero 依赖）

**不做**：连续视频 VLM、30fps CV、SLAM、3D anchor、object tracking、multi-agent、RAG、后端平台、通用本体、用户登录、云同步

## 48h Kill-Test 关卡

- H+4：真机 camera → multimodal model → HUD 跑通，否则全部停止
- H+8：同场景连续三次观察产生 S0→S1→S2
- H+12：跑通 expected ≠ observed → CONFLICT → replan
- H+18：Hero 场景冻结 + 隐形 marker fallback
- Day2 AM：nod/shake、storage、rollback（任一超 2 小时不稳就砍）
- Day2 PM：停止加功能，连续 30 次完整 Demo ≥28 次成功

## Pitch 骨架（90 秒）

桌上乱 →「把这里变成能开始路演的状态」→ WORLD DIFF 4 changes → 逐项 patch → 故意错 → CONFLICT → replan → DEMO READY → 「恢复刚才」ROLLBACK（可选）→ 收尾：

> "Most AI glasses answer questions about reality. Mine edits it."
> "Software has patches. Physical intelligence should too."
