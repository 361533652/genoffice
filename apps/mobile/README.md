# GenOffice Android 宿主

把六个编辑器装进一个 Android WebView 的原生宿主。渲染层就是浏览器宿主跑的那套
生产构建（`vite build` 产物），打进 APK assets——首屏 5.7–14.7 MB 的下载成本变成
一次性安装成本。

## 现状

- 六应用从 assets 加载（WebViewAssetLoader，https 安全源，无 file:// 的 CORS 问题）
- document-start 注入 `assets/host/genoffice-host.js`：
  - `__genofficeHost` 门面（SAF 支持 saveInPlace）
  - `__genofficeSheetsWasmUrl` → sheets 启动时安装 wasm 工作簿会话
    （与桌面同一个 Rust sidecar，编译到 wasm32-wasip1）
  - 长按 → contextmenu 合成（WebView 默认不触发，159 处右键菜单依赖它）
  - blob: 下载拦截 → SAF（WebView 的 DownloadListener 看不到 blob 下载）
- `<input type=file>` 经 `onShowFileChooser` 路由到 SAF
- 设置/确认框走 `GenOfficeNative` JS 接口（SharedPreferences / AlertDialog）

## 构建

前置：JDK 17、Android SDK（platform 35 / build-tools 35.0.0）、Rust（wasm32-wasip1 target）。
本机环境已装在 `E:\Android`（ANDROID_HOME / JAVA_HOME 已设用户级环境变量）。

```bash
# 1. wasm 引擎（约 1 分钟）
cd apps/sheets/native/xlsx-engine
cargo build --target wasm32-wasip1 --release

# 2. 六应用生产构建 + wasm → assets（在仓库根）
node apps/mobile/scripts/copy-web-assets.mjs

# 3. APK
gradle -p apps/mobile assembleDebug
# 产物: apps/mobile/app/build/outputs/apk/debug/app-debug.apk
adb install -r apps/mobile/app/build/outputs/apk/debug/app-debug.apk
```

## 已知边界

- 崩溃恢复副本（writeWorkbookRecovery）在移动宿主诚实返回 {ok:false}：
  还没有持久化恢复存储，不假装保护用户。
- AI / 打印 / PDF 页面手术等能力位仍为 false（需要各自的原生实现）。
- wasm 会话目前在主线程同步执行，大文件打开/重算会阻塞 UI；
  下一步移进 Web Worker（客户端接口已是 async，改动局部）。
- slides 的 deck session 尚未实现（pptx-engine 纯 TS，可在宿主内做）。
