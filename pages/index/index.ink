<script def>
{
  "navigationBarTitleText": "World Patch"
}
</script>

<script setup>
import wx from 'wx';
import { DEMO_READY_V1 } from '../../lib/goals.js';
import { createWorld, applyObservation, nextCondition } from '../../lib/world.js';
import { hudView } from '../../lib/hud.js';
import { capturePhotoAsDataUrl } from '../../lib/camera.js';
import { createObserver } from '../../lib/observer.js';

export default {
  data: {
    hud: hudView({ phase: 'IDLE' }),
  },

  onShow() {
    if (!this._world) {
      this.resetFlow();
    }
  },

  onHide() {
    this.teardownRuntime();
  },

  resetFlow() {
    this._goal = DEMO_READY_V1;
    this._world = createWorld(this._goal);
    this._phase = 'IDLE';
    this._condition = null;
    this._conflict = null;
    this._feedback = null;
    this._error = null;
    this._busy = false;
    this.setHud();
  },

  setHud() {
    this.setData({
      hud: hudView({
        phase: this._phase,
        goal: this._goal,
        world: this._world,
        condition: this._condition,
        conflict: this._conflict,
        feedback: this._feedback,
        error: this._error,
      }),
    });
  },

  onKeyDown(event) {
    if (!event) return;
    if (event.code === 'Backspace') {
      wx.exitMiniProgram();
      return;
    }
    if (event.code !== 'Enter') return;
    this.handleEnter();
  },

  handleEnter() {
    if (this._busy) return;
    switch (this._phase) {
      case 'IDLE':
        this._phase = 'BRIEF';
        this.setHud();
        break;
      case 'BRIEF':
        this._condition = nextCondition(this._world, this._goal);
        this._phase = 'ACTIVE';
        this.setHud();
        break;
      case 'ACTIVE':
      case 'FEEDBACK':
      case 'CONFLICT':
      case 'ERROR':
        this.verify();
        break;
      case 'VERIFIED':
        this._conflict = null;
        this._condition = nextCondition(this._world, this._goal);
        this._phase = this._condition ? 'ACTIVE' : 'READY';
        this.setHud();
        break;
      case 'READY':
        this.resetFlow();
        break;
      default:
        break;
    }
  },

  async ensureObserver() {
    if (!this._observer) {
      this._observer = await createObserver({ goal: this._goal });
    }
    return this._observer;
  },

  async verify() {
    if (this._busy) return;
    this._busy = true;
    this._phase = 'VERIFYING';
    this.setHud();

    try {
      const observer = await this.ensureObserver();
      const { dataUrl } = await capturePhotoAsDataUrl('high');
      const observations = await observer.observe(dataUrl);
      const result = applyObservation(this._world, this._goal, observations);
      this._world = result.world;

      if (result.events.conflicts.length > 0) {
        this._conflict = result.events.conflicts[0];
        this._phase = 'CONFLICT';
      } else if (this._condition && this._world.conditions[this._condition.id].status === 'satisfied') {
        this._phase = 'VERIFIED';
      } else {
        const cur = this._condition ? this._world.conditions[this._condition.id] : null;
        this._feedback = {
          line1: (cur && cur.evidence) || (this._condition ? this._condition.vlmDescription : '条件尚未满足'),
          line2: cur && cur.status === 'unverifiable' ? '看不清，请调整角度或光线后重拍' : '请对照描述调整桌面后重试',
        };
        this._phase = 'FEEDBACK';
      }
    } catch (err) {
      this._error = describeError(err);
      this._phase = 'ERROR';
    } finally {
      this._busy = false;
      this.setHud();
    }
  },

  teardownRuntime() {
    if (this._observer) {
      this._observer.destroy();
      this._observer = null;
    }
  },
};

function describeError(err) {
  const code = err && err.code;
  if (code === 'LM_UNAVAILABLE') {
    return { line1: '视觉模型不可用', line2: '请检查眼镜网络后重试' };
  }
  if (code === 'TIMEOUT') {
    return { line1: '观察请求超时', line2: '网络较慢，按 ENTER 重试' };
  }
  if (code === 'CAMERA_UNAVAILABLE' || code === 'NO_PHOTO_DATA') {
    return { line1: '相机不可用或未返回图像', line2: '请确认相机权限后重试' };
  }
  if (code === 'NO_TOOLCALL') {
    return { line1: '模型未返回结构化观察', line2: '按 ENTER 重试' };
  }
  return { line1: (err && err.message) || '未知错误', line2: '按 ENTER 重试' };
}
</script>

<page>
  <view class="stage">
    <view class="frame {{hud.frame}}">
      <view class="row top">
        <text class="eyebrow">{{hud.eyebrow}}</text>
        <text class="progress">{{hud.progressText}}</text>
      </view>
      <view class="col center">
        <text class="glyph">{{hud.glyph}}</text>
        <text class="title">{{hud.title}}</text>
        <text class="line1">{{hud.line1}}</text>
        <text class="line2">{{hud.line2}}</text>
      </view>
      <view class="row bottom">
        <text class="hint">{{hud.hint}}</text>
      </view>
    </view>
  </view>
</page>

<style>
.stage {
  width: 480px;
  height: 352px;
  padding: 12px 16px;
  box-sizing: border-box;
}

.frame {
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px;
  border: 1px solid rgba(64, 255, 94, 0.48);
  border-radius: 6px;
}

.frame.idle {
  border-color: rgba(64, 255, 94, 0.24);
}

.frame.active {
  border-color: rgba(64, 255, 94, 0.72);
}

.frame.verify {
  border-color: #40ff5e;
}

.frame.verified {
  border-color: rgba(64, 255, 94, 0.72);
  background: rgba(64, 255, 94, 0.06);
}

.frame.conflict {
  border: 2px dashed rgba(64, 255, 94, 0.72);
}

.frame.ready {
  border-color: #40ff5e;
  background: rgba(64, 255, 94, 0.06);
}

.row {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.top {
  justify-content: space-between;
}

.bottom {
  justify-content: center;
}

.col {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.center {
  justify-content: center;
}

.eyebrow {
  color: rgba(64, 255, 94, 0.48);
  font-family: sans-serif;
  font-size: 11px;
  letter-spacing: 2px;
}

.progress {
  color: rgba(64, 255, 94, 0.72);
  font-family: monospace;
  font-size: 13px;
  letter-spacing: 1px;
}

.glyph {
  color: #40ff5e;
  font-family: monospace;
  font-size: 28px;
  margin-bottom: 8px;
}

.title {
  color: #40ff5e;
  font-family: sans-serif;
  font-size: 22px;
  font-weight: 500;
  margin-bottom: 12px;
}

.line1 {
  color: rgba(64, 255, 94, 0.72);
  font-family: sans-serif;
  font-size: 14px;
  margin-bottom: 6px;
  text-align: center;
}

.line2 {
  color: rgba(64, 255, 94, 0.48);
  font-family: sans-serif;
  font-size: 12px;
  text-align: center;
}

.hint {
  color: rgba(64, 255, 94, 0.24);
  font-family: sans-serif;
  font-size: 10px;
  letter-spacing: 1px;
}
</style>
