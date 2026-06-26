# YAMEILO Linear 风格 UI 重构 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 YAMEILO 的 UI 视觉重构为对齐 Linear 设计系统的风格（暗色优先、克制、专业），亮/暗双主题均重做，功能零改动。

**Architecture:** 三层落地——(1) `src/index.css` 重写为 5 组设计 token（亮/暗双套）+ 旧变量名别名；(2) 新建 `src/styles/primitives.css` 沉淀共享基元类（`.btn`/`.input`/`.card`/`.chip`/`.toolbar`/`.divider`/`.kbd`）；(3) 逐个组件 CSS 按 Linear 视觉语言重写，消费 token 与基元类。JSX 结构与功能逻辑零改动，仅 `main.tsx`（引入顺序）、`YAMLEditor.tsx`（Monaco 自定义主题）、`index.html`（字体）有少量改动。

**Tech Stack:** React 18 + TypeScript + Vite + Monaco Editor + CSS Variables。无自动化测试框架，采用人工视觉走查 + `npm run build` 类型检查作为验证。

**Spec:** `docs/superpowers/specs/2026-06-27-linear-ui-refactor-design.md`

---

## 文件结构

| 文件 | 责任 | 操作 |
|---|---|---|
| `package.json` | 增加 `@fontsource-variable/inter` 依赖 | 修改 |
| `src/index.css` | 5 组设计 token（亮/暗）+ 旧名别名 + 全局 reset | 重写 |
| `src/styles/primitives.css` | 共享基元类 | 新建 |
| `src/main.tsx` | 引入顺序：index.css → primitives.css → App | 修改 |
| `src/App.css` | 布局外壳 | 微调 |
| `src/components/FileUploader.css` | 上传区样式 | 重写 |
| `src/components/YAMLEditor.css` | 编辑器外壳样式 | 重写 |
| `src/components/YAMLEditor.tsx` | 注册 Monaco 自定义主题 | 修改 |
| `src/components/StatsPanel.css` | 统计面板样式 | 重写 |
| `src/components/TemplateManager.css` | 模板管理样式 | 重写 |
| `src/components/YAMLVisualizer.css` | 主框架/工具栏样式（移除本地 `.btn`） | 重写 |
| `src/components/YAMLForm.css` | 表单样式（最重） | 重写 |
| `index.html` | 字体预加载链接 | 修改 |

**关键约束：**
- 所有现有功能行为完全保留，不新增/不删除/不改快捷键。
- primitives.css 必须在组件 CSS 之前加载（由 `main.tsx` 引入顺序保证），使组件 CSS 中残留的同名选择器可被清理后让基元类接管。
- 旧变量名别名仅作过渡，最后清理阶段移除。

---

## Task 1: 安装 Inter Variable 字体依赖

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`（由 npm 自动更新）

- [ ] **Step 1: 安装依赖**

Run:
```bash
npm install @fontsource-variable/inter
```
Expected: `added N packages` 且 `package.json` 的 `dependencies` 出现 `"@fontsource-variable/inter": "^..."`。

- [ ] **Step 2: 验证依赖写入**

Run:
```bash
node -e "console.log(require('./package.json').dependencies['@fontsource-variable/inter'])"
```
Expected: 输出一个版本号字符串（非 `undefined`）。

- [ ] **Step 3: 提交**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): 添加 @fontsource-variable/inter 自托管字体"
```

---

## Task 2: 重写 `src/index.css` — 设计 Token 体系

**Files:**
- Modify: `src/index.css`（整体重写）

- [ ] **Step 1: 用以下完整内容替换 `src/index.css`**

```css
/* ===== Design Tokens — Linear-aligned ===== */

:root {
  /* Light theme — restrained mirror of Linear dark-first */
  --bg-canvas: #f7f9f9;
  --bg-surface: #ffffff;
  --bg-surface-raised: #ffffff;
  --bg-hover: rgba(0, 0, 0, 0.04);
  --bg-active: rgba(0, 0, 0, 0.08);

  --text-primary: #000000;
  --text-secondary: #425364;
  --text-tertiary: #8b98a5;

  --border: rgba(0, 0, 0, 0.08);
  --border-strong: rgba(0, 0, 0, 0.14);

  --accent-primary: #1d9bf0;
  --accent-primary-hover: #1a8cd8;
  --accent-success: #00ba7c;
  --accent-attention: #f91880;
  --accent-ai: #6bc9fb;

  --overlay-strong: rgba(0, 0, 0, 0.20);

  /* Typography */
  --font-sans: 'InterVariable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --font-mono: 'JetBrains Mono', Consolas, Monaco, 'Courier New', monospace;

  --text-xs: 12px;
  --text-sm: 13px;
  --text-base: 14px;
  --text-md: 15px;
  --title-3: 16px;
  --title-2: 20px;
  --title-1: 24px;

  --fw-regular: 400;
  --fw-medium: 500;
  --fw-semibold: 600;
  --fw-bold: 700;

  --lh-tight: 1.25;
  --lh-regular: 1.5;
  --tracking-tight: -0.01em;
  --tracking-normal: 0;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;

  /* Radius */
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-pill: 999px;

  /* Motion */
  --speed-quick: 120ms;
  --speed-regular: 200ms;
  --ease: cubic-bezier(0.4, 0, 0.2, 1);

  /* Legacy aliases (transitional — removed in cleanup phase) */
  --bg-primary: var(--bg-canvas);
  --bg-secondary: var(--bg-surface);
  --bg-tertiary: var(--bg-surface-raised);
  --primary-color: var(--accent-primary);
  --primary-hover: var(--accent-primary-hover);
  --secondary-color: var(--text-secondary);
  --secondary-hover: var(--text-tertiary);
  --border-color: var(--border);
  --error-bg: rgba(249, 24, 128, 0.10);
  --error-border: rgba(249, 24, 128, 0.24);
  --error-text: var(--accent-attention);
  --success-color: var(--accent-success);
  --success-hover: #00a06b;
  --warning-color: var(--accent-ai);
  --warning-hover: #4ab8f0;
  --shadow: transparent;
}

[data-theme="dark"] {
  --bg-canvas: #08090a;
  --bg-surface: #0d0e10;
  --bg-surface-raised: #111316;
  --bg-hover: rgba(255, 255, 255, 0.06);
  --bg-active: rgba(255, 255, 255, 0.10);

  --text-primary: #ffffff;
  --text-secondary: #829aab;
  --text-tertiary: #425364;

  --border: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.14);

  --overlay-strong: rgba(0, 0, 0, 0.20);

  --error-bg: rgba(249, 24, 128, 0.12);
  --error-border: rgba(249, 24, 128, 0.28);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: var(--lh-regular);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: var(--bg-canvas);
  min-height: 100vh;
  color: var(--text-primary);
  transition: background-color var(--speed-regular) var(--ease),
    color var(--speed-regular) var(--ease);
}

#root {
  min-height: 100vh;
  background: var(--bg-canvas);
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0ms !important;
    animation-duration: 0ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

- [ ] **Step 2: 启动开发服务器验证无报错**

Run: `npm run dev`
Expected: Vite 正常启动，浏览器打开后应用已换上新配色（亮色为浅灰白底，暗色为 `#08090a` 深底），无 CSS 解析错误。组件形态尚未变（预期）。

- [ ] **Step 3: 类型与构建检查**

Run: `npm run build`
Expected: `tsc && vite build` 通过，无类型错误。

- [ ] **Step 4: 提交**

```bash
git add src/index.css
git commit -m "refactor(tokens): 重写 index.css 为 Linear 风格 5 组设计 token"
```

---

## Task 3: 新建 `src/styles/primitives.css` — 共享基元层

**Files:**
- Create: `src/styles/primitives.css`

- [ ] **Step 1: 创建文件并写入以下完整内容**

```css
/* ===== Shared primitives — Linear-aligned ===== */

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: var(--fw-medium);
  line-height: var(--lh-tight);
  color: var(--text-primary);
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color var(--speed-quick) var(--ease),
    border-color var(--speed-quick) var(--ease),
    color var(--speed-quick) var(--ease);
}

.btn svg {
  flex-shrink: 0;
}

.btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(29, 155, 240, 0.16);
}

.btn-primary {
  background: #ffffff;
  color: #000000;
  border-color: #ffffff;
}
.btn-primary:hover {
  background: rgba(255, 255, 255, 0.88);
}
[data-theme="dark"] .btn-primary {
  background: #ffffff;
  color: #000000;
}

.btn-accent {
  background: var(--accent-primary);
  color: #ffffff;
  border-color: var(--accent-primary);
}
.btn-accent:hover {
  background: var(--accent-primary-hover);
  border-color: var(--accent-primary-hover);
}

.btn-secondary,
.btn-ghost {
  background: transparent;
  color: var(--text-primary);
  border-color: var(--border-strong);
}
.btn-secondary:hover,
.btn-ghost:hover {
  background: var(--bg-hover);
  border-color: var(--border-strong);
}

.btn-secondary.active {
  background: var(--bg-active);
  color: var(--accent-primary);
  border-color: var(--accent-primary);
}

.btn-danger {
  background: transparent;
  color: var(--accent-attention);
  border-color: rgba(249, 24, 128, 0.3);
}
.btn-danger:hover {
  background: rgba(249, 24, 128, 0.1);
  border-color: rgba(249, 24, 128, 0.5);
}

.btn-icon {
  padding: 6px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  border-color: transparent;
}
.btn-icon:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.btn-sm {
  padding: 4px 8px;
  font-size: var(--text-xs);
}

.btn-lg {
  padding: 8px 16px;
  font-size: var(--text-md);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Inputs */
.input {
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: var(--lh-regular);
  transition: border-color var(--speed-quick) var(--ease),
    box-shadow var(--speed-quick) var(--ease),
    background-color var(--speed-quick) var(--ease);
}
.input:hover {
  border-color: var(--border-strong);
}
.input:focus,
.input:focus-visible {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(29, 155, 240, 0.16);
}
.input-readonly,
.input[readonly] {
  background: var(--bg-hover);
  color: var(--text-secondary);
  cursor: not-allowed;
}

/* Cards / surfaces */
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}
.card-raised {
  background: var(--bg-surface-raised);
  border-color: var(--border-strong);
}

/* Chips / status badges */
.chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: var(--fw-medium);
  line-height: var(--lh-tight);
  border: 1px solid transparent;
  white-space: nowrap;
}
.chip-neutral {
  background: var(--bg-hover);
  color: var(--text-secondary);
  border-color: var(--border);
}
.chip-blue {
  background: rgba(29, 155, 240, 0.12);
  color: var(--accent-primary);
  border-color: rgba(29, 155, 240, 0.24);
}
.chip-green {
  background: rgba(0, 186, 124, 0.12);
  color: var(--accent-success);
  border-color: rgba(0, 186, 124, 0.24);
}
.chip-pink {
  background: rgba(249, 24, 128, 0.12);
  color: var(--accent-attention);
  border-color: rgba(249, 24, 128, 0.24);
}
.chip-cyan {
  background: rgba(107, 201, 251, 0.14);
  color: var(--accent-ai);
  border-color: rgba(107, 201, 251, 0.28);
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
}

/* Divider */
.divider {
  height: 1px;
  background: var(--border);
  border: 0;
}
.divider-v {
  width: 1px;
  height: 16px;
  background: var(--border);
  border: 0;
  align-self: center;
}

/* Kbd hint */
.kbd {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-xs);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  background: var(--bg-surface);
}
```

- [ ] **Step 2: 提交**

```bash
git add src/styles/primitives.css
git commit -m "feat(primitives): 新增共享基元样式层 (btn/input/card/chip/toolbar/divider/kbd)"
```

---

## Task 4: 更新 `src/main.tsx` — 引入顺序与字体

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: 用以下完整内容替换 `src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/inter'
import './index.css'
import './styles/primitives.css'
import App from './App'
import './App.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

> 说明：`@fontsource-variable/inter` 注入全局 `InterVariable` 字体；`index.css` → `primitives.css` → `App.css` 的顺序保证基元类先于组件 CSS 加载，组件 CSS 中清理掉的同名选择器可由基元类接管。

- [ ] **Step 2: 验证字体加载**

Run: `npm run dev`
Expected: 浏览器中 UI 文字呈 Inter 字形（无衬线、字形比系统字体更紧凑），DevTools Network 可见 `inter-variable.woff2` 已加载。

- [ ] **Step 3: 构建检查**

Run: `npm run build`
Expected: 通过。

- [ ] **Step 4: 提交**

```bash
git add src/main.tsx
git commit -m "refactor(main): 调整 CSS 引入顺序并加载 Inter Variable 字体"
```

---

## Task 5: 重写 `src/components/FileUploader.css`

**Files:**
- Modify: `src/components/FileUploader.css`（整体重写）

- [ ] **Step 1: 用以下完整内容替换文件**

```css
.file-uploader {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  cursor: pointer;
  transition: border-color var(--speed-quick) var(--ease),
    background-color var(--speed-quick) var(--ease);
  border: 1px dashed var(--border-strong);
}

.file-uploader:hover {
  border-color: var(--accent-primary);
  background: var(--bg-hover);
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  color: var(--accent-primary);
}

.upload-area svg {
  opacity: 0.8;
  transition: opacity var(--speed-quick) var(--ease);
}

.file-uploader:hover .upload-area svg {
  opacity: 1;
}

.upload-area h2 {
  color: var(--text-primary);
  font-size: var(--title-3);
  margin: 0;
  font-weight: var(--fw-semibold);
  letter-spacing: var(--tracking-tight);
}

.upload-area p {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  margin: 0;
}
```

- [ ] **Step 2: 视觉验证**

Run: `npm run dev`，上传一个 YAML 文件前观察上传区。
Expected: 虚线薄边框、无重阴影、hover 时边框转 accent 蓝 + 轻微背景叠加；标题用 Inter semibold。

- [ ] **Step 3: 提交**

```bash
git add src/components/FileUploader.css
git commit -m "style(FileUploader): 重写为 Linear 风格 (薄虚线边框、无重阴影)"
```

---

## Task 6: 重写 `src/components/YAMLEditor.css` + Monaco 自定义主题

**Files:**
- Modify: `src/components/YAMLEditor.css`（整体重写）
- Modify: `src/components/YAMLEditor.tsx:252-304`（`handleEditorDidMount` 内注册主题）
- Modify: `src/components/YAMLEditor.tsx:411-435`（`theme` prop 改用自定义主题名）

- [ ] **Step 1: 用以下完整内容替换 `src/components/YAMLEditor.css`**

```css
.yaml-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-canvas);
  overflow: hidden;
  transition: background-color var(--speed-regular) var(--ease);
}

.yaml-editor .monaco-editor {
  border-radius: 0;
  background: var(--bg-canvas);
}

.yaml-editor .monaco-editor .margin {
  background-color: var(--bg-canvas);
  transition: background-color var(--speed-regular) var(--ease);
}
```

- [ ] **Step 2: 在 `YAMLEditor.tsx` 的 `handleEditorDidMount` 内、`editor.updateOptions(...)` 之前插入主题注册**

定位 `handleEditorDidMount: OnMount = (editor: any, monaco: any) => {` 函数体，在 `editorRef.current = editor` 之后、`monaco.languages.setLanguageConfiguration` 之前插入：

```tsx
      // 注册对齐 Linear 风格的自定义 Monaco 主题
      monaco.editor.defineTheme('yameilo-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '425364', fontStyle: 'italic' },
          { token: 'string', foreground: '6bc9fb' },
          { token: 'number', foreground: '00ba7c' },
          { token: 'keyword', foreground: '1d9bf0' },
          { token: 'key', foreground: '829aab' },
          { token: 'type', foreground: 'f91880' },
        ],
        colors: {
          'editor.background': '#08090a',
          'editor.foreground': '#ffffff',
          'editorLineNumber.foreground': '#425364',
          'editorLineNumber.activeForeground': '#829aab',
          'editor.selectionBackground': '#1d9bf033',
          'editor.lineHighlightBackground': '#ffffff08',
          'editorCursor.foreground': '#1d9bf0',
          'editorWhitespace.foreground': '#ffffff14',
          'editorIndentGuide.background': '#ffffff0a',
          'editorIndentGuide.activeBackground': '#ffffff1a',
          'editorError.foreground': '#f91880',
          'editorWarning.foreground': '#6bc9fb',
          'editorGutter.background': '#08090a',
          'scrollbarSlider.background': '#ffffff14',
          'scrollbarSlider.hoverBackground': '#ffffff1a',
        },
      })

      monaco.editor.defineTheme('yameilo-light', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '8b98a5', fontStyle: 'italic' },
          { token: 'string', foreground: '0e8bb0' },
          { token: 'number', foreground: '008f5d' },
          { token: 'keyword', foreground: '1a8cd8' },
          { token: 'key', foreground: '425364' },
          { token: 'type', foreground: 'd4146b' },
        ],
        colors: {
          'editor.background': '#f7f9f9',
          'editor.foreground': '#000000',
          'editorLineNumber.foreground': '#8b98a5',
          'editorLineNumber.activeForeground': '#425364',
          'editor.selectionBackground': '#1d9bf033',
          'editor.lineHighlightBackground': '#00000008',
          'editorCursor.foreground': '#1d9bf0',
          'editorWhitespace.foreground': '#00000014',
          'editorIndentGuide.background': '#0000000a',
          'editorIndentGuide.activeBackground': '#0000001a',
          'editorError.foreground': '#f91880',
          'editorWarning.foreground': '#1a8cd8',
          'editorGutter.background': '#f7f9f9',
          'scrollbarSlider.background': '#00000014',
          'scrollbarSlider.hoverBackground': '#0000001a',
        },
      })
```

- [ ] **Step 3: 修改 `<Editor>` 的 `theme` prop**

在 `YAMLEditor.tsx` 的 `<Editor ... />` JSX 中，将：

```tsx
          theme={theme === 'dark' ? 'vs-dark' : 'vs'}
```

改为：

```tsx
          theme={theme === 'dark' ? 'yameilo-dark' : 'yameilo-light'}
```

- [ ] **Step 4: 视觉验证**

Run: `npm run dev`，加载一个含多种类型的 YAML。
Expected: 暗色下编辑器背景为 `#08090a`、行号灰蓝、选中为半透明蓝、错误波浪线为粉色 `#f91880`；亮色下背景为 `#f7f9f9`。切换主题时编辑器主题随之联动。

- [ ] **Step 5: 构建检查**

Run: `npm run build`
Expected: 通过，无 TS 错误。

- [ ] **Step 6: 提交**

```bash
git add src/components/YAMLEditor.css src/components/YAMLEditor.tsx
git commit -m "style(YAMLEditor): 重写外壳样式并注册 yameilo-dark/light Monaco 主题"
```

---

## Task 7: 重写 `src/components/StatsPanel.css`

**Files:**
- Modify: `src/components/StatsPanel.css`（整体重写）

- [ ] **Step 1: 用以下完整内容替换文件**

```css
.stats-panel {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-3);
  overflow: hidden;
  transition: border-color var(--speed-regular) var(--ease);
}

.stats-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  user-select: none;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  transition: background-color var(--speed-quick) var(--ease);
}

.stats-panel-header:hover {
  background: var(--bg-hover);
}

.stats-panel-title {
  font-weight: var(--fw-semibold);
  font-size: var(--text-sm);
  color: var(--text-primary);
  letter-spacing: var(--tracking-tight);
}

.stats-panel-toggle {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  transition: color var(--speed-quick) var(--ease),
    transform var(--speed-quick) var(--ease);
}

.stats-panel.open .stats-panel-toggle {
  transform: rotate(90deg);
}

.stats-panel-content {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border);
}

.stat-item:last-child {
  border-bottom: none;
}

.stat-item-full {
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  font-weight: var(--fw-medium);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat-value {
  font-family: var(--font-mono);
  font-size: var(--text-md);
  font-weight: var(--fw-semibold);
  color: var(--accent-primary);
}

.type-distribution {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.type-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
}

.type-name {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  min-width: 50px;
}

.type-bar-container {
  flex: 1;
  height: 6px;
  background: var(--bg-hover);
  border-radius: var(--radius-pill);
  overflow: hidden;
}

.type-bar {
  height: 100%;
  border-radius: var(--radius-pill);
  transition: width var(--speed-regular) var(--ease);
}

.type-string { background: var(--accent-primary); }
.type-number { background: var(--accent-success); }
.type-boolean { background: var(--accent-ai); }
.type-object { background: var(--accent-attention); }
.type-array { background: var(--accent-ai); }

.type-count {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--fw-semibold);
  color: var(--text-primary);
  min-width: 30px;
  text-align: right;
}

.type-item-empty {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  text-align: center;
  padding: var(--space-2) 0;
}
```

> 说明：类型分布条配色改为 Linear 四色（string=蓝、number=绿、boolean=青、object=粉、array=青），移除原有的 `[data-theme="dark"]` 类型条覆盖块（不再需要，token 已自适应）。

- [ ] **Step 2: 视觉验证**

Run: `npm run dev`，加载 YAML 后展开统计面板。
Expected: 卡片薄边框、统计数字用等宽字体 + accent 蓝、类型条为细窄 pill 形（6px 高），亮/暗切换颜色一致无残留旧色。

- [ ] **Step 3: 提交**

```bash
git add src/components/StatsPanel.css
git commit -m "style(StatsPanel): 重写为 Linear 风格卡片与四色类型条"
```

---

## Task 8: 重写 `src/components/TemplateManager.css`

**Files:**
- Modify: `src/components/TemplateManager.css`（整体重写）

- [ ] **Step 1: 用以下完整内容替换文件**

```css
.template-menu-container {
  position: relative;
  display: inline-block;
}

.template-menu {
  position: absolute;
  top: calc(100% + var(--space-1));
  right: 0;
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  min-width: 320px;
  max-width: 400px;
  max-height: 600px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 2px var(--overlay-strong);
  transition: background-color var(--speed-regular) var(--ease),
    border-color var(--speed-regular) var(--ease);
}

.template-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
}

.template-menu-title {
  font-weight: var(--fw-semibold);
  font-size: var(--text-sm);
  color: var(--text-primary);
  letter-spacing: var(--tracking-tight);
}

.template-menu-close {
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  color: var(--text-secondary);
  padding: var(--space-1);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: background-color var(--speed-quick) var(--ease),
    color var(--speed-quick) var(--ease);
}

.template-menu-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.template-menu-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.template-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.template-section-title {
  font-size: var(--text-xs);
  font-weight: var(--fw-semibold);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: var(--space-1) 0;
}

.template-save-btn {
  width: 100%;
  padding: 8px 12px;
  background: #ffffff;
  color: #000000;
  border: 1px solid #ffffff;
  border-radius: var(--radius-sm);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: var(--fw-medium);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  transition: background-color var(--speed-quick) var(--ease);
}
.template-save-btn:hover {
  background: rgba(255, 255, 255, 0.88);
}
[data-theme="dark"] .template-save-btn {
  background: #ffffff;
  color: #000000;
}

.template-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  transition: background-color var(--speed-quick) var(--ease),
    border-color var(--speed-quick) var(--ease);
}

.template-item:hover {
  background: var(--bg-hover);
  border-color: var(--border-strong);
}

.template-item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.template-item-name {
  font-weight: var(--fw-semibold);
  font-size: var(--text-sm);
  color: var(--text-primary);
}

.template-item-desc {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: var(--lh-regular);
}

.template-item-date {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: 2px;
}

.template-item-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: var(--space-3);
}

.template-item-apply {
  padding: 4px 10px;
  background: var(--accent-primary);
  color: #ffffff;
  border: 1px solid var(--accent-primary);
  border-radius: var(--radius-sm);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: var(--fw-medium);
  cursor: pointer;
  white-space: nowrap;
  transition: background-color var(--speed-quick) var(--ease);
}
.template-item-apply:hover {
  background: var(--accent-primary-hover);
  border-color: var(--accent-primary-hover);
}

.template-item-delete {
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  color: var(--text-tertiary);
  padding: var(--space-1);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: background-color var(--speed-quick) var(--ease),
    color var(--speed-quick) var(--ease);
}
.template-item-delete:hover {
  background: rgba(249, 24, 128, 0.1);
  color: var(--accent-attention);
}

.template-delete-confirm {
  display: flex;
  gap: var(--space-1);
}

.template-delete-yes,
.template-delete-no {
  padding: 2px 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-xs);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: var(--fw-medium);
  cursor: pointer;
  transition: background-color var(--speed-quick) var(--ease);
}

.template-delete-yes {
  background: var(--accent-attention);
  color: #ffffff;
}
.template-delete-yes:hover {
  background: #d4146b;
}

.template-delete-no {
  background: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--border);
}
.template-delete-no:hover {
  background: var(--bg-active);
}

.template-empty {
  text-align: center;
  padding: var(--space-5) var(--space-4);
  color: var(--text-tertiary);
  font-size: var(--text-sm);
}

/* 保存对话框 */
.template-save-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--overlay-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.template-save-dialog {
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 2px var(--overlay-strong);
}

.template-save-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border);
}

.template-save-dialog-title {
  font-weight: var(--fw-semibold);
  font-size: var(--title-3);
  color: var(--text-primary);
  letter-spacing: var(--tracking-tight);
}

.template-save-dialog-close {
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  color: var(--text-secondary);
  padding: var(--space-1);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: background-color var(--speed-quick) var(--ease),
    color var(--speed-quick) var(--ease);
}
.template-save-dialog-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.template-save-dialog-content {
  padding: var(--space-5);
  flex: 1;
  overflow-y: auto;
}

.template-save-field {
  margin-bottom: var(--space-4);
}
.template-save-field:last-child {
  margin-bottom: 0;
}

.template-save-field label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--fw-medium);
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.template-save-field input,
.template-save-field textarea {
  width: 100%;
  padding: 8px 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--text-primary);
  transition: border-color var(--speed-quick) var(--ease),
    box-shadow var(--speed-quick) var(--ease);
}

.template-save-field input:focus,
.template-save-field textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(29, 155, 240, 0.16);
}

.template-save-field textarea {
  resize: vertical;
  min-height: 80px;
}

.template-save-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--border);
}

.template-save-dialog-footer .btn {
  min-width: 80px;
}
.template-save-dialog-footer .btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

- [ ] **Step 2: 视觉验证**

Run: `npm run dev`，打开模板菜单与保存对话框。
Expected: 菜单/对话框为 raised 面板 + 薄强边框 + 极淡阴影（`--overlay-strong`），无重阴影；删除按钮 hover 显粉色；保存按钮为白底黑字高对比。

- [ ] **Step 3: 提交**

```bash
git add src/components/TemplateManager.css
git commit -m "style(TemplateManager): 重写为 Linear 风格面板与对话框"
```

---

## Task 9: 重写 `src/components/YAMLVisualizer.css`

**Files:**
- Modify: `src/components/YAMLVisualizer.css`（整体重写，移除本地 `.btn`/`.btn-primary`/`.btn-secondary` 定义，交由 primitives）

- [ ] **Step 1: 用以下完整内容替换文件**

```css
.yaml-visualizer-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
}

.yaml-visualizer {
  background: var(--bg-canvas);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  transition: background-color var(--speed-regular) var(--ease);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  min-height: 40px;
  transition: background-color var(--speed-regular) var(--ease),
    border-color var(--speed-regular) var(--ease);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.file-icon {
  color: var(--accent-primary);
  flex-shrink: 0;
  margin-left: var(--space-1);
}

.file-name {
  font-family: var(--font-sans);
  font-weight: var(--fw-semibold);
  color: var(--text-primary);
  font-size: var(--text-sm);
  letter-spacing: var(--tracking-tight);
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  user-select: none;
  transition: background-color var(--speed-quick) var(--ease);
}

.file-name:hover {
  background: var(--bg-hover);
}

.file-name-input {
  font-family: var(--font-sans);
  font-weight: var(--fw-semibold);
  color: var(--text-primary);
  font-size: var(--text-sm);
  background: var(--bg-surface);
  border: 1px solid var(--accent-primary);
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-2);
  outline: none;
  min-width: 150px;
  transition: border-color var(--speed-quick) var(--ease),
    box-shadow var(--speed-quick) var(--ease);
}

.file-name-input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(29, 155, 240, 0.16);
}

.parse-error {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  background: rgba(249, 24, 128, 0.12);
  color: var(--accent-attention);
  border: 1px solid rgba(249, 24, 128, 0.24);
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: var(--fw-medium);
}

.toolbar-right {
  display: flex;
  gap: var(--space-1);
  align-items: center;
  flex-wrap: wrap;
}

.github-star-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  color: var(--text-secondary);
  padding: var(--space-1) var(--space-2);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  text-decoration: none;
  flex-shrink: 0;
  font-size: var(--text-xs);
  font-weight: var(--fw-medium);
  transition: background-color var(--speed-quick) var(--ease),
    color var(--speed-quick) var(--ease);
}

.github-star-link:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.github-star-text {
  white-space: nowrap;
}

.github-star-link svg {
  display: block;
  flex-shrink: 0;
}

.search-container {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-2);
  min-width: 180px;
  max-width: 250px;
  transition: border-color var(--speed-quick) var(--ease),
    box-shadow var(--speed-quick) var(--ease);
}

.search-container:focus-within {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(29, 155, 240, 0.16);
}

.search-icon {
  color: var(--text-tertiary);
  flex-shrink: 0;
  margin-right: var(--space-1);
}

.search-input {
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.search-clear-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-tertiary);
  padding: var(--space-1);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-xs);
  flex-shrink: 0;
  margin-left: var(--space-1);
  transition: background-color var(--speed-quick) var(--ease),
    color var(--speed-quick) var(--ease);
}

.search-clear-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.search-count {
  padding: 1px 6px;
  background: var(--accent-primary);
  color: #ffffff;
  border-radius: var(--radius-pill);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--fw-semibold);
  margin-right: var(--space-1);
  min-width: 20px;
  text-align: center;
}

/* `.btn` / `.btn-primary` / `.btn-secondary` / `.btn-secondary.active`
   现由 src/styles/primitives.css 提供，此处不再重复定义。 */

.export-menu-container {
  position: relative;
  display: inline-block;
}

.export-menu {
  position: absolute;
  top: calc(100% + var(--space-1));
  right: 0;
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  padding: var(--space-1);
  min-width: 120px;
  z-index: 1000;
  box-shadow: 0 1px 2px var(--overlay-strong);
}

.export-menu-item {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  cursor: pointer;
  border-radius: var(--radius-xs);
  text-align: left;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  transition: background-color var(--speed-quick) var(--ease),
    color var(--speed-quick) var(--ease);
}

.export-menu-item:hover {
  background: var(--bg-hover);
  color: var(--accent-primary);
}

.export-menu-item span {
  flex: 1;
}

.visualizer-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  gap: 0;
}

.editor-panel {
  flex: 0 0 55%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border);
  transition: border-color var(--speed-regular) var(--ease);
}

.form-panel {
  flex: 0 0 45%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.form-container {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3);
}
```

> 说明：移除了原 `.btn`/`.btn-primary`/`.btn-secondary` 本地定义，由 primitives 接管（tsx 中 `className="btn btn-primary"` / `btn btn-secondary` 继续生效）。`.parse-error` 改为 chip 风格 + 粉色。`.editor-panel` 移除 `padding-right`，`.form-panel` 移除 `padding-left`，双面板间仅留 1px 竖向分隔。

- [ ] **Step 2: 视觉验证**

Run: `npm run dev`，加载 YAML。
Expected: 工具栏 40px 高、薄下边框；按钮来自 primitives（白底黑字 primary / 描边 ghost secondary）；双面板间 1px 竖线分隔、无内边距间隙；解析错误为粉色 pill chip；搜索框 focus 时 accent 蓝 ring。

- [ ] **Step 3: 提交**

```bash
git add src/components/YAMLVisualizer.css
git commit -m "style(YAMLVisualizer): 重写工具栏与面板分隔，移除本地 .btn 由 primitives 接管"
```

---

## Task 10: 重写 `src/components/YAMLForm.css`（最重）

**Files:**
- Modify: `src/components/YAMLForm.css`（整体重写）

- [ ] **Step 1: 用以下完整内容替换文件**

```css
.yaml-form-item {
  display: flex;
  align-items: flex-start;
}

.yaml-form-item:has(.form-textarea) {
  align-items: flex-start;
}

/* Inputs (value) */
.form-input {
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: var(--lh-regular);
  flex: 1;
  max-width: 400px;
  background: var(--bg-surface);
  color: var(--text-primary);
  transition: border-color var(--speed-quick) var(--ease),
    box-shadow var(--speed-quick) var(--ease);
}

.form-input:hover {
  border-color: var(--border-strong);
}

.form-input-string {
  flex: 0 1 auto;
  min-width: 120px;
  max-width: 800px;
  width: auto;
}

.form-textarea {
  resize: vertical;
  min-height: 60px;
  max-height: 300px;
  min-width: 500px;
  width: 100%;
  max-width: 1200px;
  font-family: var(--font-mono);
  line-height: var(--lh-regular);
  overflow-y: auto;
  flex: 1;
  align-self: stretch;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(29, 155, 240, 0.16);
}

.form-input.readonly {
  background: var(--bg-hover);
  color: var(--text-secondary);
  cursor: not-allowed;
}

/* Boolean toggle */
.boolean-toggle {
  display: flex;
  gap: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--bg-surface);
}

.toggle-option {
  flex: 1;
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: var(--fw-medium);
  cursor: pointer;
  min-width: 60px;
  transition: background-color var(--speed-quick) var(--ease),
    color var(--speed-quick) var(--ease);
}

.toggle-option:hover {
  background: var(--bg-hover);
}

.toggle-option.active {
  background: var(--accent-primary);
  color: #ffffff;
}

/* Nested level guides */
.yaml-form-object,
.yaml-form-array {
  margin-left: var(--space-3);
  border-left: 1px solid var(--border);
  padding-left: var(--space-3);
}

.yaml-form-object.empty-object {
  margin-left: 0;
  border-left: none;
  padding-left: 0;
}

.form-controls {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--border);
}

/* Control button (ghost/accent) */
.control-btn {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: 6px 10px;
  background: transparent;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: var(--fw-medium);
  color: var(--text-primary);
  cursor: pointer;
  transition: background-color var(--speed-quick) var(--ease),
    border-color var(--speed-quick) var(--ease),
    color var(--speed-quick) var(--ease);
}

.control-btn:hover {
  background: var(--bg-hover);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.control-btn svg {
  flex-shrink: 0;
}

/* Items */
.yaml-form-object-item,
.yaml-form-array-item {
  margin-bottom: var(--space-1);
}

.yaml-form-object-item.dragging,
.yaml-form-array-item.dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.yaml-form-object-item.drag-over,
.yaml-form-array-item.drag-over {
  border-top: 2px solid var(--accent-primary);
  padding-top: var(--space-1);
}

.object-item-header,
.array-item-header {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  background: var(--bg-surface);
  border-radius: var(--radius-sm);
  cursor: grab;
  border: 1px solid transparent;
  transition: background-color var(--speed-quick) var(--ease),
    border-color var(--speed-quick) var(--ease);
}

.object-item-header:active,
.array-item-header:active {
  cursor: grabbing;
}

.object-item-header:hover,
.array-item-header:hover {
  background: var(--bg-hover);
  border-color: var(--border);
}

/* Expand chevron */
.expand-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-tertiary);
  padding: var(--space-1);
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-xs);
  flex-shrink: 0;
  transition: background-color var(--speed-quick) var(--ease),
    color var(--speed-quick) var(--ease),
    transform var(--speed-quick) var(--ease);
}

.expand-btn:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

.expand-btn svg {
  flex-shrink: 0;
  transition: transform var(--speed-quick) var(--ease);
}

/* Drag handle */
.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-1);
  color: var(--text-tertiary);
  cursor: grab;
  flex-shrink: 0;
  user-select: none;
  transition: color var(--speed-quick) var(--ease);
}

.drag-handle:hover {
  color: var(--text-secondary);
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-handle svg {
  flex-shrink: 0;
}

/* Key input */
.key-input {
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--fw-semibold);
  color: var(--text-primary);
  min-width: 100px;
  background: var(--bg-surface);
  transition: border-color var(--speed-quick) var(--ease),
    box-shadow var(--speed-quick) var(--ease);
}

.key-input:hover {
  border-color: var(--border-strong);
}

.key-input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(29, 155, 240, 0.16);
}

/* Array index chip */
.array-index {
  font-family: var(--font-mono);
  font-weight: var(--fw-semibold);
  color: var(--accent-primary);
  min-width: 45px;
  font-size: var(--text-xs);
  padding: 1px 8px;
  background: rgba(29, 155, 240, 0.12);
  border: 1px solid rgba(29, 155, 240, 0.24);
  border-radius: var(--radius-pill);
  text-align: center;
}

/* Type badge (chip style, type-colored) */
.type-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: var(--fw-medium);
  background: var(--bg-hover);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

/* Locate / copy icon buttons (ghost icon) */
.locate-btn,
.copy-path-btn {
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-xs);
  padding: var(--space-1);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: var(--text-tertiary);
  transition: background-color var(--speed-quick) var(--ease),
    color var(--speed-quick) var(--ease);
}

.locate-btn {
  margin-left: auto;
}

.copy-path-btn {
  margin-left: var(--space-1);
}

.locate-btn:hover,
.copy-path-btn:hover {
  background: var(--bg-hover);
  color: var(--accent-primary);
}

.locate-btn svg,
.copy-path-btn svg {
  flex-shrink: 0;
}

/* Delete button (danger icon) */
.delete-btn {
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-xs);
  padding: var(--space-1);
  cursor: pointer;
  margin-left: var(--space-1);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: var(--text-tertiary);
  transition: background-color var(--speed-quick) var(--ease),
    color var(--speed-quick) var(--ease);
}

.delete-btn:hover {
  background: rgba(249, 24, 128, 0.1);
  color: var(--accent-attention);
}

.delete-btn svg {
  flex-shrink: 0;
}

.nested-content {
  margin-top: var(--space-1);
  margin-left: var(--space-3);
}

/* Add buttons */
.add-btn {
  margin-top: var(--space-2);
  padding: 6px 12px;
  background: var(--accent-success);
  color: #ffffff;
  border: 1px solid var(--accent-success);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: var(--fw-medium);
  display: flex;
  align-items: center;
  gap: var(--space-1);
  transition: background-color var(--speed-quick) var(--ease),
    border-color var(--speed-quick) var(--ease);
}

.add-btn:hover {
  background: #00a06b;
  border-color: #00a06b;
}

.add-btn svg {
  flex-shrink: 0;
}

.add-btn-icon {
  margin-top: var(--space-2);
  background: transparent;
  color: var(--accent-success);
  border: 1px solid transparent;
  border-radius: var(--radius-xs);
  padding: var(--space-1);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  transition: background-color var(--speed-quick) var(--ease),
    color var(--speed-quick) var(--ease);
}

.add-btn-icon:hover {
  background: rgba(0, 186, 124, 0.12);
  color: var(--accent-success);
}

.add-btn-icon svg {
  flex-shrink: 0;
}

/* Add menu */
.add-item-container {
  position: relative;
  display: inline-block;
  z-index: 1;
}

.add-menu {
  position: absolute;
  top: 0;
  left: 100%;
  margin-left: var(--space-1);
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  z-index: 1000;
  min-width: 120px;
  overflow: hidden;
  box-shadow: 0 1px 2px var(--overlay-strong);
}

.add-menu-item {
  display: block;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  text-align: left;
  cursor: pointer;
  transition: background-color var(--speed-quick) var(--ease),
    color var(--speed-quick) var(--ease);
}

.add-menu-item:hover {
  background: var(--bg-hover);
  color: var(--accent-primary);
}

.add-menu-item:not(:last-child) {
  border-bottom: 1px solid var(--border);
}

/* Type selector */
.type-selector-container {
  position: relative;
  display: inline-block;
}

.type-selector-btn {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: 1px 8px;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: var(--fw-medium);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color var(--speed-quick) var(--ease),
    border-color var(--speed-quick) var(--ease),
    color var(--speed-quick) var(--ease);
}

.type-selector-btn:hover {
  border-color: var(--border-strong);
  color: var(--text-primary);
}

.type-label {
  white-space: nowrap;
}

.type-menu {
  position: absolute;
  top: 0;
  left: 100%;
  margin-left: var(--space-1);
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  z-index: 1000;
  min-width: 100px;
  overflow: hidden;
  box-shadow: 0 1px 2px var(--overlay-strong);
}

.type-menu-item {
  display: block;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  text-align: left;
  cursor: pointer;
  transition: background-color var(--speed-quick) var(--ease),
    color var(--speed-quick) var(--ease);
}

.type-menu-item:hover {
  background: var(--bg-hover);
  color: var(--accent-primary);
}

.type-menu-item.active {
  background: var(--bg-active);
  color: var(--accent-primary);
  font-weight: var(--fw-semibold);
}

.type-menu-item:not(:last-child) {
  border-bottom: 1px solid var(--border);
}

/* Search highlight */
.search-highlight {
  background: rgba(107, 201, 251, 0.3);
  color: var(--text-primary);
  padding: 1px 4px;
  border-radius: var(--radius-xs);
  font-weight: var(--fw-semibold);
}

.search-match {
  position: relative;
}

.search-match::before {
  content: '';
  position: absolute;
  left: -4px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--accent-ai);
  border-radius: var(--radius-pill);
}

.search-match-input {
  background-color: rgba(107, 201, 251, 0.18) !important;
  border-color: var(--accent-ai) !important;
}

.value-container {
  flex: 1;
  display: flex;
  align-items: center;
}

.search-no-results {
  padding: var(--space-4);
  text-align: center;
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-style: italic;
  background: var(--bg-hover);
  border-radius: var(--radius-sm);
  margin: var(--space-2) 0;
}

/* Path highlight (locate) */
.path-highlighted {
  position: relative;
  background-color: rgba(29, 155, 240, 0.16) !important;
  border: 1px solid rgba(29, 155, 240, 0.4) !important;
  border-radius: var(--radius-sm);
  padding: var(--space-1);
  margin: -1px;
  z-index: 10;
  transition: background-color var(--speed-regular) var(--ease),
    border-color var(--speed-regular) var(--ease);
}

.path-highlighted::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--accent-primary);
  border-radius: var(--radius-pill);
}

.path-highlighted.path-highlighted-fadeout {
  opacity: 0;
}

/* Inline comment */
.inline-comment {
  padding: 1px 8px;
  margin-left: var(--space-2);
  background: var(--bg-hover);
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-style: italic;
  border-radius: var(--radius-xs);
  border: 1px solid var(--border);
  white-space: nowrap;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
  transition: background-color var(--speed-quick) var(--ease),
    color var(--speed-quick) var(--ease),
    max-width var(--speed-regular) var(--ease);
}

.inline-comment:hover {
  background: var(--bg-active);
  color: var(--text-primary);
  max-width: 500px;
  white-space: normal;
  word-break: break-word;
  z-index: 10;
  position: relative;
}

/* Toast */
.toast-message {
  position: fixed;
  top: var(--space-5);
  right: var(--space-5);
  background: var(--accent-success);
  color: #ffffff;
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-sm);
  z-index: 10000;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: var(--fw-medium);
  animation: toastSlideIn var(--speed-regular) var(--ease);
  max-width: 300px;
}

@keyframes toastSlideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

> 关键变化：
> - 所有 hover/active/focus 改用 token + accent 蓝 ring，移除硬编码 `rgba(59,130,246,...)`。
> - 移除所有 `transform: translateY(-1px)` / `scale(...)` hover 位移与重阴影。
> - 嵌套层级用 `--space-3` 缩进 + 左侧 1px `--border` 引导线。
> - `.type-badge` / `.type-selector-btn` / `.array-index` 改为 chip 风格（pill 圆角 + 低透明背景 + 边框）。
> - `.delete-btn` hover 改为粉色 danger；`.add-btn*` 保留绿色但改为描边/弱填充 + token。
> - `.locate-btn` / `.copy-path-btn` 改为 ghost 图标按钮。
> - 路径高亮：保留出现/消失动画但简化为颜色过渡，左侧指示条用 accent 蓝；移除大段 keyframes 与多层 box-shadow（`prefers-reduced-motion` 由 `index.css` 全局兜底）。
> - 搜索高亮改用 `--accent-ai`（青）。

- [ ] **Step 2: 视觉与功能验证**

Run: `npm run dev`，加载含嵌套对象/数组/多类型/注释的 YAML，逐项走查：
- 表单输入框 focus 为 accent 蓝 ring；键名输入同。
- 类型标签为 chip pill；类型选择菜单为 raised 面板。
- 添加项（绿色）按钮 hover 为弱填充；删除按钮 hover 显粉色。
- 嵌套层级左侧有细引导线，缩进 12px。
- 拖拽排序：被拖项半透明、落点 accent 蓝细边。
- 搜索：匹配项左侧青色细条 + 输入框青色高亮。
- 路径定位：点击表单项 → 编辑器定位 + 蓝色高亮淡入/淡出。
- 注释以等宽斜体灰色 chip 展示，hover 展开。

Expected: 全部正常，无残留红色/重阴影/位移动画。

- [ ] **Step 3: 构建检查**

Run: `npm run build`
Expected: 通过。

- [ ] **Step 4: 提交**

```bash
git add src/components/YAMLForm.css
git commit -m "style(YAMLForm): 重写为 Linear 风格 (chip 类型标签、细线分层、accent ring、移除重阴影)"
```

---

## Task 11: 更新 `index.html` 字体链接

**Files:**
- Modify: `index.html:22-25`

- [ ] **Step 1: 调整 `<head>` 中字体链接**

将 `index.html` 中的：

```html
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
```

替换为：

```html
    <!-- Inter Variable 由 @fontsource-variable/inter 自托管，无需 Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
```

> 说明：保留 JetBrains Mono（代码/表单等宽字体）的 Google Fonts 引入；Inter Variable 已由 `@fontsource-variable/inter` 通过 `main.tsx` 自托管注入。此步实际仅保留注释说明，不改变 JetBrains Mono 引入。若希望彻底自托管 JetBrains Mono，可在后续清理阶段引入 `@fontsource/jetbrains-mono`，本计划不强制。

- [ ] **Step 2: 提交**

```bash
git add index.html
git commit -m "docs(index): 注明 Inter Variable 改为自托管加载"
```

---

## Task 12: 清理 — 移除旧变量名别名与遗留硬编码

**Files:**
- Modify: `src/index.css`（移除 "Legacy aliases" 块）
- Modify: 各组件 CSS（扫除残留旧 token 名引用）

- [ ] **Step 1: 全局搜索旧 token 名引用**

Run:
```bash
rg --no-heading "var\(--(bg-primary|bg-secondary|bg-tertiary|primary-color|primary-hover|secondary-color|secondary-hover|border-color|error-bg|error-border|error-text|success-color|success-hover|warning-color|warning-hover|shadow)\)" src
```
Expected: 列出所有仍在使用旧名别名的位置（理论上组件重写后应为零或极少）。

- [ ] **Step 2: 逐处将旧名替换为新 token**

按以下映射替换：
- `--bg-primary` → `--bg-canvas`
- `--bg-secondary` → `--bg-surface`
- `--bg-tertiary` → `--bg-surface-raised`
- `--primary-color` → `--accent-primary`
- `--primary-hover` → `--accent-primary-hover`
- `--secondary-color` → `--text-secondary`
- `--secondary-hover` → `--text-tertiary`
- `--border-color` → `--border`
- `--error-bg` / `--error-border` / `--error-text` → 对应 `rgba(249,24,128,...)` / `--accent-attention`
- `--success-color` → `--accent-success`
- `--success-hover` → `#00a06b`
- `--warning-color` → `--accent-ai`
- `--warning-hover` → `#4ab8f0`
- `--shadow` → `transparent` 或移除该属性

- [ ] **Step 3: 从 `src/index.css` 删除 "Legacy aliases" 块**

删除 `:root` 中以 `/* Legacy aliases ... */` 开头、到 `--shadow: transparent;` 为止的整块别名定义。`[data-theme="dark"]` 中的 `--error-bg` / `--error-border` 两行也删除（已无消费者）。

- [ ] **Step 4: 验证无残留**

Run:
```bash
rg --no-heading "var\(--(bg-primary|bg-secondary|bg-tertiary|primary-color|primary-hover|secondary-color|secondary-hover|border-color|error-bg|error-border|error-text|success-color|success-hover|warning-color|warning-hover|shadow)\)" src
```
Expected: 无输出（全部迁移完成）。

- [ ] **Step 5: 搜索其他硬编码颜色**

Run:
```bash
rg --no-heading "rgba\(59,\s*130,\s*246|#3b82f6|#10b981|#f59e0b|#8b5cf6|#ec4899|#ef4444|#60a5fa|#34d399|#fbbf24|#a78bfa|#f472b6" src
```
Expected: 无输出（除 `index.html`/Monaco 主题中已显式指定的颜色外，组件 CSS 不再含旧硬编码色）。

- [ ] **Step 6: 构建检查**

Run: `npm run build`
Expected: 通过。

- [ ] **Step 7: 提交**

```bash
git add src/index.css src/components
git commit -m "refactor(tokens): 移除旧变量名别名，组件 CSS 全部迁移到新 token"
```

---

## Task 13: 最终验收走查

**Files:**
- 无文件改动，仅验证

- [ ] **Step 1: 亮/暗双主题功能走查**

Run: `npm run dev`，分别在亮色与暗色主题下，按 spec"明确边界"功能列表逐项验证：
1. 上传 YAML（点击 + 拖拽）、保存、文件名编辑、清空
2. 双面板实时同步（编辑器改 → 表单更新；表单改 → 编辑器更新）
3. 表单增删改、键名重命名、类型转换（5 种类型互转）
4. 拖拽排序（数组项 + 对象键）
5. 递归展开/折叠
6. 搜索（`Ctrl/Cmd+F`、实时高亮、匹配计数、`Esc` 清除）
7. 智能排序、格式化
8. 主题切换 + 刷新后持久化
9. 导出 JSON/TOML/XML
10. 模板管理（保存/应用/删除确认）
11. 统计面板（展开/折叠、类型分布）
12. 路径定位/高亮、路径复制
13. 注释保留与显示

Expected: 全部功能行为与重构前一致。

- [ ] **Step 2: 视觉一致性走查**

对照 `design.md` 关键词验收：
- 暗色画布 `#08090a`、薄 1px 边框、无重阴影、无渐变、柔和圆角。
- 强调色仅蓝/绿/粉/青四色，错误用粉。
- 字体为 Inter，数字/路径/代码为 JetBrains Mono。
- hover/focus 仅颜色变化、120ms；chevron 旋转为唯一 transform。
- 工具栏 40px、双面板 1px 竖线分隔。

- [ ] **Step 3: 响应式走查**

在 DevTools 中切换 `640 / 768 / 1024 / 1280` 四档视口。
Expected: 布局正常，窄屏下工具栏不溢出（按钮可换行/收为图标，文件名省略）。

- [ ] **Step 4: 可访问性走查**

- Tab 遍历主要控件，确认 focus ring 可见（accent 蓝）。
- 系统设置开启 `prefers-reduced-motion`，确认动画降为瞬时。
- 暗色下正文（白字 on `#08090a`）对比度 ≥ WCAG AA。

- [ ] **Step 5: 生产构建验证**

Run:
```bash
npm run build && npm run preview
```
Expected: 构建通过，预览站点视觉与开发态一致。

- [ ] **Step 6: 提交验收记录（可选）**

如有任何验收中发现的小修，修复后提交：
```bash
git add -A
git commit -m "style: 验收走查后的最终微调"
```

---

## 自检（计划作者已完成）

**Spec 覆盖：**
- §1 Token 体系 → Task 2 ✓
- §2 基元层 → Task 3 + Task 4 ✓
- §3.1 YAMLVisualizer → Task 9 ✓
- §3.2 YAMLEditor + Monaco 主题 → Task 6 ✓
- §3.3 YAMLForm → Task 10 ✓
- §3.4 StatsPanel → Task 7 ✓
- §3.5 TemplateManager → Task 8 ✓
- §3.6 FileUploader → Task 5 ✓
- §3.7 App.css + index.css → Task 2（index.css 全局 reset 已含；App.css 无需改动，布局由 YAMLVisualizer 控制）✓
- §3.8 index.html 字体 → Task 11 + Task 1 ✓
- §4 布局节奏与动效 → 贯穿 Task 5–10 + Task 2 reduced-motion ✓
- §5 文件结构/迁移/验收 → Task 1–13 顺序即迁移策略，Task 13 即验收 ✓

**类型/命名一致性：** primitives 的 `.btn`/`.btn-primary`/`.btn-secondary`/`.btn-ghost`/`.btn-danger`/`.btn-icon`/`.input`/`.card`/`.chip-*`/`.toolbar`/`.divider`/`.kbd` 与组件重写中引用一致；Monaco 主题名 `yameilo-dark` / `yameilo-light` 在 Task 6 注册与使用处一致；旧→新 token 映射在 Task 12 与 Task 2 别名一致。

**占位符扫描：** 无 TBD/TODO/"实现细节后补"。
