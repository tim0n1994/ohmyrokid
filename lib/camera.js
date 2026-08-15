// 相机封装：takePhoto → base64 data URL。链路对齐官方 capabilities/scanner 样例。

import wx from 'wx';

let cachedContext = null;

function getCameraContext() {
  if (!cachedContext) {
    cachedContext = wx.media.createCameraContext();
  }
  return cachedContext;
}

export async function capturePhotoAsDataUrl(quality = 'high') {
  const ctx = getCameraContext();
  if (!ctx || typeof ctx.takePhoto !== 'function') {
    throw { code: 'CAMERA_UNAVAILABLE', message: '相机不可用' };
  }

  const photo = await ctx.takePhoto({ quality });
  if (!photo || !photo.data || !photo.mimeType) {
    throw { code: 'NO_PHOTO_DATA', message: '拍照未返回图像数据' };
  }
  if (typeof wx.arrayBufferToBase64 !== 'function') {
    throw { code: 'NO_BASE64_API', message: 'arrayBufferToBase64 不可用' };
  }

  const dataUrl = `data:${photo.mimeType};base64,${wx.arrayBufferToBase64(photo.data)}`;
  return { dataUrl, mimeType: photo.mimeType };
}

export function resetCameraContext() {
  cachedContext = null;
}
