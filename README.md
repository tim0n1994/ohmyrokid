# World Patch 现实补丁

Rokid Glasses 黑客松参赛项目。AIUI 沉浸式智能体。

一句话：你告诉眼镜「我想让现实变成什么样」，它观察当前世界，计算 Current → Target 的差异，一步步指导你修改现实、验证修改、发现冲突、重新规划。

核心循环：Intent → Observe(W) → Compile(W*) → Diff → Patch → Act → Verify

## 本地开发

1. 本目录就是标准 AIUI Agent 工程（AGENTS.md / app.json / app.js / pages/）。
2. 用 Craft（AIUI Web IDE）导入本文件夹：https://js.rokid.com/craft
3. Craft 内点「运行智能体」做 Web 端模拟调试（可模拟语音、按键、返回）。
4. 编码辅助：项目内已安装 `aiui-dev` 技能（.agents/skills/aiui-dev/），含 API 参考、组件参考、单绿设计系统。

## 真机调试

1. Craft 中打包 → 上传绑定到 AIUI Studio（https://aiui.rokid.com/space）的 World Patch Agent。
2. 眼镜：设置 → 开发者 → AIUI → 更新眼镜资源包。
3. 唤醒 AI 助手，说出智能体名称即可运行。

注意：AIUI 真机调试走云端资源包，不依赖 USB/adb。

## 参考工程

- `../aiui-official/` — AIUI 官方仓库（文档、样例、设计系统）
  - `samples/scanner/` — 相机 takePhoto + BarcodeDetector 已验证路径（Enter 键触发）
  - `samples/capabilities/` — 传感器/语音/条码等完整能力样例
  - `documentation/` — 官方文档（0-guide 快速开始 / 3-api / 4-design / 5-tools）

## 硬件要点（Rokid Glasses）

- Snapdragon AR1 Gen 1 + NXP RT600，2GB RAM / 32GB 存储
- 双眼 Micro-LED 单绿光波导，~1500 nits，FOV ~30°，参考画布 480×352（safe area 左右 16px 上下 12px）
- 12MP Sony IMX681，109° 广角，定焦（34cm–∞，无自动对焦）→ 适合场景状态判断，不适合小元件识别
- 网络：眼镜 → 蓝牙 → 手机 → 互联网（代理链路），Demo 控制在 4–5 次多模态调用内

## 详细策略

见 `docs/STRATEGY.md`（源自 ChatGPT 会话「Rokid黑客松策略建议」的执行摘要）。
