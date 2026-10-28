# World Patch 现实补丁

[English](README.en.md)

[Preview release v0.1.0-preview.2](https://github.com/tim0n1994/ohmyrokid/releases/tag/v0.1.0-preview.2) · [MIT License](LICENSE) · [安全策略](SECURITY.md)

> Tell the glasses what you want reality to become.
>
> 让眼镜理解你想要的现实，并带你把它改出来。

World Patch 是一个运行在 Rokid Glasses 上的 AIUI 沉浸式智能体，也是一个黑客松参赛项目。

它把“我想让现实变成什么样”变成一条可核验的修改路径：观察当前世界，计算 Current → Target 的差异，分步执行补丁，检查冲突，并在每一步之后重新规划。

```
Intent → Observe(W) → Compile(W*) → Diff → Patch → Act → Verify
意图    → 观察       → 编译         → 差异 → 补丁  → 行动 → 核验
```

## 为什么是 World Patch？

普通对话只返回建议；World Patch 试图把建议变成现实中的下一步动作。

它不假设一次识别就足够准确，也不把“已经发出”当成“已经发生”。每次动作都要经过当前状态、目标状态和执行结果之间的核对：

- **Observe**：理解眼镜看到的当前场景。
- **Compile**：把自然语言意图编译成可执行的目标状态。
- **Diff**：指出当前状态与目标状态之间的差异。
- **Patch**：拆成可以逐步执行的动作。
- **Verify**：检查结果、发现冲突，必要时重新规划。

## 5 分钟体验路径

1. 用 Craft 导入本目录：<https://js.rokid.com/craft>。
2. 在 Craft 中点击“运行智能体”，用 Web 模拟语音、按键和返回。
3. 对智能体说出希望现实如何变化，观察它如何从当前状态生成下一步。
4. 需要真机时，在 Craft 中打包并上传到 AIUI Studio：<https://aiui.rokid.com/space>。
5. 眼镜端进入“设置 → 开发者 → AIUI”，更新资源包，再唤醒 AI 助手说出智能体名称。

本地工程是标准 AIUI Agent 工程，包含 `AGENTS.md`、`app.json`、`app.js` 和 `pages/`。项目内已安装 `aiui-dev` 技能，提供 API、组件和单绿设计系统参考。

## 当前边界

- 真机调试使用云端资源包，不依赖 USB/adb。
- 眼镜通过蓝牙连接手机，再由手机访问互联网。
- Demo 控制在 4–5 次多模态调用内。
- 摄像头适合判断场景状态，不适合识别细小元件。
- 这是黑客松原型；硬件能力、网络链路和 AIUI 资源包仍决定可验证范围。

## 硬件要点

- Snapdragon AR1 Gen 1 + NXP RT600，2GB RAM / 32GB 存储。
- 双眼 Micro-LED 单绿光波导，约 1500 nits，FOV 约 30°，参考画布 480×352（safe area 左右 16px、上下 12px）。
- 12MP Sony IMX681，109° 广角，定焦（34cm–∞）。

## 参考工程

- `../aiui-official/`：AIUI 官方仓库、文档、样例和设计系统。
  - `samples/scanner/`：相机 `takePhoto` + `BarcodeDetector` 已验证路径。
  - `samples/capabilities/`：传感器、语音、条码等能力样例。
  - `documentation/`：快速开始、API、设计和工具文档。

## 详细策略

见 [docs/STRATEGY.md](docs/STRATEGY.md)，其中保留了从黑客松策略讨论整理出的执行摘要。
