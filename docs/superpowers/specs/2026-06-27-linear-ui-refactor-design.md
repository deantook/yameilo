# YAMEILO UI 重构设计 — 对齐 Linear 设计系统

> 日期：2026-06-27
> 依据：`design.md`（Linear 设计系统捕获）
> 范围：全面视觉重构（视觉 + 组件 + 布局节奏 + 动效），功能零改动

## 目标与边界

### 目标
将 YAMEILO（YAML 可视化编辑器）的 UI 风格重构为对齐 `design.md` 所述 Linear 设计系统的视觉语言：暗色优先、克制、专业、产品感。亮色与暗色双主题均按 Linear 风格重新设计对应 token。

### 明确边界（功能保持不变）
以下功能行为与交互流程**完全保留**，仅改外观，不新增、不删除、不改快捷键、不改数据结构：
- 文件上传（拖拽/点击）、保存、文件名编辑、清空
- 注释保留（`yaml` 库 `parseDocument`）
- 双面板实时同步（Monaco 编辑器 ↔ 表单）
- 表单增删改、键名重命名、类型转换（string/number/boolean/object/array）
- 拖拽排序（数组项 / 对象键，含视觉反馈）
- 递归展开/折叠
- 搜索（`Ctrl+F` / `Cmd+F`，实时高亮、匹配计数、`Esc` 清除）
- 智能排序、格式化
- 主题切换 + 持久化 + 系统偏好检测
- 导出 JSON/TOML/XML
- 模板管理、统计面板
- 路径定位/高亮、路径复制

## 关键决策（来自澄清问答）

| 维度 | 决策 |
|---|---|
| 主题策略 | 双主题都按 Linear 风格重新设计（亮/暗各一套 token） |
| 重构范围 | 全面重构（视觉 + 组件 + 布局节奏 + 动效） |
| 核心布局 | 保留双面板（Monaco 编辑器 + 表单），仅调整间距/分隔/节奏 |
| UI 字体 | 采用 Inter（Variable）作为 UI 字体 |
| 信息密度 | 均衡（比当前略紧凑，保留呼吸感） |
| 语义色 | 纯 Linear palette（蓝/绿/粉/青），用粉色表达错误/注意，不保留红色 |
| 实现方案 | 方案 C：Token 体系化 + 共享基元层 + 组件重写 |

## §1 设计 Token 体系

将 `src/index.css` 顶部的两套 CSS 变量重组为 5 组 token，亮/暗双套。

### 1.1 颜色 token

**暗色（Linear dark-first，默认）**
- `--bg-canvas: #08090a`（主画布）
- `--bg-surface: #0d0e10`（面板）
- `--bg-surface-raised: #111316`（悬浮面）
- `--bg-hover: rgba(255,255,255,0.06)`
- `--bg-active: rgba(255,255,255,0.10)`
- `--text-primary: #ffffff`
- `--text-secondary: #829aab`
- `--text-tertiary: #425364`
- `--border: rgba(255,255,255,0.08)`
- `--border-strong: rgba(255,255,255,0.14)`
- `--accent-primary: #1d9bf0`
- `--accent-primary-hover: #1a8cd8`
- `--accent-success: #00ba7c`
- `--accent-attention: #f91880`（错误/注意，替代红）
- `--accent-ai: #6bc9fb`
- `--overlay-strong: rgba(0,0,0,0.20)`（分隔/遮罩，取代重阴影）

**亮色（镜像，保持克制）**
- `--bg-canvas: #f7f9f9`
- `--bg-surface: #ffffff`
- `--bg-surface-raised: #ffffff`
- `--bg-hover: rgba(0,0,0,0.04)`
- `--bg-active: rgba(0,0,0,0.08)`
- `--text-primary: #000000`
- `--text-secondary: #425364`
- `--text-tertiary: #8b98a5`
- `--border: rgba(0,0,0,0.08)`
- `--border-strong: rgba(0,0,0,0.14)`
- 强调色四色与暗色相同：`#1d9bf0` / `#00ba7c` / `#f91880` / `#6bc9fb`，亮色下可微调 hover 态。

### 1.2 字体 token
- `--font-sans: 'InterVariable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
- `--font-mono: 'JetBrains Mono', Consolas, Monaco, 'Courier New', monospace`（代码区与表单值保留等宽）
- 字号：`--text-xs: 12px` / `--text-sm: 13px` / `--text-base: 14px` / `--text-md: 15px` / `--title-3` / `--title-2` / `--title-1`（标题用变量驱动）
- 字重：`--fw-regular: 400` / `--fw-medium: 500` / `--fw-semibold: 600` / `--fw-bold: 700`
- 行高：`--lh-tight: 1.25` / `--lh-regular: 1.5`
- 字距：`--tracking-tight: -0.01em` / `--tracking-normal: 0`

### 1.3 间距 token（均衡密度）
`--space-1: 4px` / `--space-2: 8px` / `--space-3: 12px` / `--space-4: 16px` / `--space-5: 24px` / `--space-6: 32px` / `--space-7: 48px`

### 1.4 圆角 token（柔和、不锋利）
`--radius-xs: 4px` / `--radius-sm: 6px` / `--radius-md: 8px` / `--radius-lg: 12px` / `--radius-pill: 999px`

### 1.5 动效 token（克制、快速）
- `--speed-quick: 120ms` / `--speed-regular: 200ms` / `--ease: cubic-bezier(0.4, 0, 0.2, 1)`
- 过渡仅用于 `color`、`background-color`、`border-color`、`opacity`，不用于 transform 大幅位移。

### 1.6 兼容性（过渡期别名）
为避免一次性回归，保留旧变量名（`--bg-primary` / `--bg-secondary` / `--bg-tertiary` / `--bg-hover` / `--primary-color` / `--primary-hover` / `--text-primary` / `--text-secondary` / `--text-tertiary` / `--border-color` / `--secondary-color` / `--error-*` / `--success-*` / `--warning-*` / `--shadow`）作为新 token 的别名。组件 CSS 在过渡期可继续工作，逐步迁移到新 token 名；最后阶段统一清理。

## §2 共享基元层（`src/styles/primitives.css`）

新建一个被全局引入的基元样式表，沉淀 Linear 风格的通用组件类。各组件消费这些类 + token，消除重复定义。

### 2.1 按钮
- `.btn` — 基类：`inline-flex`、居中、`padding: 6px 12px`、`border-radius: var(--radius-sm)`、`font-weight: var(--fw-medium)`、`font-size: var(--text-sm)`、`border: 1px solid transparent`、`transition: background-color/border-color/color var(--speed-quick) var(--ease)`
- `.btn-primary` — 实心高对比：暗色下 `background: #fff; color: #000`（Linear 标志性反差），hover 轻微降明度
- `.btn-accent` — 蓝色实心：`background: var(--accent-primary); color: #fff`
- `.btn-ghost` — 透明描边：`background: transparent; border-color: var(--border-strong); color: var(--text-primary)`，hover `background: var(--bg-hover)`
- `.btn-danger` — 粉色描边/弱填充：`color: var(--accent-attention); border-color: rgba(249,24,128,0.3)`，hover 弱填充
- `.btn-icon` — 仅图标方形按钮，`padding: 6px`、`border-radius: var(--radius-sm)`，默认 ghost 态
- 尺寸 modifier：`.btn-sm`（`padding: 4px 8px`、`text-xs`）、`.btn-lg`

### 2.2 输入框 / 文本域
- `.input` — `padding: 6px 10px`、`border: 1px solid var(--border)`、`border-radius: var(--radius-sm)`、`background: var(--bg-surface)`、`color: var(--text-primary)`、`font-size: var(--text-sm)`、`font-family: var(--font-mono)`
- hover：`border-color: var(--border-strong)`；focus：`border-color: var(--accent-primary)` + `box-shadow: 0 0 0 3px rgba(29,155,240,0.16)`（accent 蓝 ring，替换硬编码 `rgba(59,130,246,0.1)`）
- `.input-readonly` — `background: var(--bg-hover); color: var(--text-secondary); cursor: not-allowed`

### 2.3 卡片 / 面板
- `.card` — `background: var(--bg-surface)`、`border: 1px solid var(--border)`、`border-radius: var(--radius-lg)`、无重阴影
- `.card-raised` — 在 `.card` 基础上加 `background: var(--bg-surface-raised)` 与 `border-color: var(--border-strong)`，用于悬浮面板（StatsPanel、TemplateManager 弹层）

### 2.4 标签 / 状态 chip
- `.chip` — `inline-flex`、`padding: 2px 8px`、`border-radius: var(--radius-pill)`、`font-size: var(--text-xs)`、`font-weight: var(--fw-medium)`、`border: 1px solid transparent`
- 语义 modifier：`.chip-blue` / `.chip-green` / `.chip-pink` / `.chip-cyan` — 对应 accent 色的低透明背景 + 实色文字 + 同色边框（例：`.chip-green`：`background: rgba(0,186,124,0.12); color: var(--accent-success); border-color: rgba(0,186,124,0.24)`）
- `.chip-neutral` — 灰蓝弱态，用于类型标签/计数

### 2.5 工具栏 / 分隔
- `.toolbar` — `display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); background: var(--bg-surface); border-bottom: 1px solid var(--border)`
- `.divider` — `height: 1px; background: var(--border); border: 0`（水平分隔）；竖向分隔由组件用 `width: 1px; height: 16px; background: var(--border)` 实现
- `.kbd` — 快捷键提示：`padding: 1px 6px; border: 1px solid var(--border-strong); border-radius: var(--radius-xs); font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-secondary)`

### 2.6 引入顺序
在 `src/main.tsx` 中按顺序引入：`index.css`（token）→ `styles/primitives.css`（基元）→ 各组件 CSS。基元类不强制覆盖组件旧类，组件在重写时逐步切换到基元类。

## §3 组件重写计划

逐个组件说明改动。JSX 结构基本不动，只调 className 与少量内联样式；功能逻辑零改动。

### 3.1 `YAMLVisualizer.css` + `.tsx`（主框架 / 工具栏）
- 外壳 `.yaml-visualizer` 改用 `--bg-canvas`，去掉 `box-shadow`，用 `--border` 描边。
- `.toolbar` 改用基元 `.toolbar`：`--bg-surface` + 薄下边框，`padding: var(--space-2) var(--space-3)`，按钮换成 `.btn .btn-ghost` / `.btn-icon`。
- `.file-name` / `.file-name-input` 改用 `--font-sans`、`--text-sm`、`--fw-semibold`；hover 用 `--bg-hover`；input focus ring 改成 accent 蓝。
- `.parse-error` 改为 `.chip` 风格 + `.chip-pink`（错误用粉色表达），去掉红色块状背景。
- 主题切换、GitHub 链接等图标按钮统一为 `.btn-icon`。
- 搜索框、排序/格式化/展开按钮：统一 `.btn-ghost .btn-sm`，激活态用 `--bg-active` + accent 文字色。

### 3.2 `YAMLEditor.css` + `.tsx`（Monaco 编辑器）
- Monaco 自带主题保留 `vs-dark` / `light`，但通过 `monaco.editor.defineTheme` 自定义 `yameilo-dark`：背景对齐 `--bg-canvas`（`#08090a`）、行号/选中色用 accent 蓝、错误波浪线用 `#f91880`；以及镜像的 `yameilo-light`。
- 外层容器用 `--bg-canvas`、顶部/底部用 `--border` 分隔，去掉圆角与阴影。
- 代码字体保留 `--font-mono`（JetBrains Mono），字号 `--text-sm`。
- 编辑器内搜索/路径高亮颜色统一用 accent 蓝 + 低透明。
- Monaco 主题随应用主题切换联动（订阅 `ThemeContext`）。

### 3.3 `YAMLForm.css` + `.tsx`（表单编辑器，最重的文件）
- `.form-input` / `.form-textarea` 统一为基元 `.input`；focus ring 用 accent 蓝。
- 类型标签 / 类型选择器改为 `.chip .chip-neutral`，按类型分色：string=neutral、number=blue、boolean=green、object/array=cyan。
- 添加项按钮（➕）→ `.btn-icon` 悬浮态；删除按钮（🗑️）→ `.btn-icon` 危险态（hover 显粉色）。
- 拖拽手柄改为低调灰色，拖拽中用 `--bg-active` + `--border-strong`，落点高亮用 accent 蓝细边。
- 嵌套层级缩进改为左侧 1px `--border` 引导线（Linear 风格"细线分层"），替代当前的色块/缩进背景。
- 展开/折叠 chevron 用 `--text-tertiary`，hover `--text-secondary`。
- 路径面包屑/路径复制提示用 `.kbd` 风格。

### 3.4 `StatsPanel.css` + `.tsx`（统计面板）
- 整体改为 `.card`；弹层用 `.card-raised`。
- 统计数字用 `--font-mono` + `--fw-semibold` + `--text-md`，标签用 `--text-xs` + `--text-secondary` + 大写字距。
- 状态徽章用 `.chip` 语义色。

### 3.5 `TemplateManager.css` + `.tsx`（模板管理）
- 模板列表项改为 `.card` 行式布局：左侧标题 + 右侧操作 `.btn-icon`。
- 选中态用 `--bg-active` + 左侧 2px accent 蓝竖条。
- 新建/导入按钮用 `.btn-primary` / `.btn-ghost`。
- 弹窗/抽屉用 `.card-raised` + `--border-strong` + 低透明遮罩 `--overlay-strong`，无重阴影。

### 3.6 `FileUploader.css` + `.tsx`（上传区）
- 拖拽区改为虚线 `--border-strong` + `--bg-surface`，hover/拖入态用 accent 蓝虚线 + `--bg-hover`。
- 上传后状态用 `.chip` 表达。
- 上传按钮用 `.btn-primary`。

### 3.7 `App.css` + `index.css`
- `body` 字体改 `--font-sans`，`-webkit-font-smoothing` 保留。
- `#root` 背景用 `--bg-canvas`。
- 移除全局 `transition: background 0.3s ease` 之类的粗过渡，改由 token 统一管控（`--speed-regular`）。

### 3.8 `index.html`
- 在 `<head>` 预加载 Inter Variable（通过 `@fontsource-variable/inter` 自托管），替换/补充现有 Google Fonts 引入；保留 JetBrains Mono 引入。

## §4 布局节奏与动效

### 4.1 整体布局节奏（保留双面板）
- 顶部工具栏高度收紧到 40px，`padding: var(--space-2) var(--space-3)`；工具栏内部 `gap: var(--space-2)`，按钮组之间用竖向 `.divider`（1px、高度 16px）分组，替代间距堆叠。
- 双面板之间用 1px `--border` 竖向分隔，去掉任何间隙/圆角/阴影；面板内部各自满铺。
- 面板内边距统一：`--space-3`（12px）水平、`--space-2`（8px）垂直；表单层级每深一层缩进 `--space-3`，并由左侧 1px `--border` 引导线串联。
- 文件名、统计、模板等"信息条"统一 `--text-sm`（13px）+ `--fw-medium`，数字/路径用 `--font-mono`。
- 状态行/错误条/空状态：高度紧凑、`.chip` 风格，不再用大色块横幅。
- 响应式断点沿用现有 `640 / 768 / 1024 / 1280`，但在 `≤768` 时工具栏按钮收为 `.btn-icon`（仅图标）+ tooltip，文件名截断省略。

### 4.2 动效（克制、快速、服务于层级）
- 全局过渡统一走 token：`transition: background-color var(--speed-quick) var(--ease), border-color var(--speed-quick) var(--ease), color var(--speed-quick) var(--ease), opacity var(--speed-regular) var(--ease)`。
- 不使用 `transform` 位移、不使用 `all` 过渡、不使用重阴影动画。
- hover：仅 `background-color` / `border-color` / `color` 变化，`120ms`。
- focus：accent 蓝 ring 淡入，`120ms`。
- 展开/折叠 chevron：`transform: rotate(0 → 90deg)`，`--speed-quick`，这是唯一允许的轻量 transform。
- 拖拽：被拖项 `opacity: 0.5`（`--speed-quick`），落点边框 accent 蓝淡入；无位移动画。
- 主题切换：`body` 背景与文字色 `--speed-regular` 过渡，其余元素自然跟随 token，避免逐元素动画卡顿。
- 尊重 `prefers-reduced-motion: reduce`：全局降速到瞬时（`0ms`），仅保留颜色变化。

### 4.3 视觉质感要点（贯穿所有组件）
- **无重阴影**：深度只靠 `--border`、`--bg-surface-raised`、`--overlay-strong` 表达。
- **薄边框**：所有分隔统一 1px `--border`，强调态用 `--border-strong`。
- **柔和圆角**：控件 `--radius-sm`（6px）、卡片 `--radius-lg`（12px）、chip 椭圆 `--radius-pill`。
- **低透明叠加**：hover/active/遮罩一律用 `rgba` 叠加，不用渐变。

## §5 文件结构、迁移策略与验收

### 5.1 文件结构变更
```
src/
├── styles/
│   └── primitives.css        # 新增：基元类
├── index.css                 # 重写：5 组 token (亮/暗双套) + 旧变量名别名
├── App.css                   # 微调：布局外壳
├── main.tsx                  # 调整引入顺序
└── components/
    ├── YAMLVisualizer.css    # 重写
    ├── YAMLEditor.css        # 重写 + .tsx 注册 monaco 自定义主题
    ├── YAMLForm.css          # 重写 (最重)
    ├── StatsPanel.css        # 重写
    ├── TemplateManager.css   # 重写
    └── FileUploader.css      # 重写
```
新增依赖：`@fontsource-variable/inter`（自托管 Inter Variable，避免 Google Fonts 阻塞）。

### 5.2 迁移策略（分阶段、可回归）
1. **Token 层**：重写 `index.css`，引入新 token + 旧名别名。此步完成后应用已换色，但形态未变，可独立验证。
2. **基元层**：新建 `primitives.css` 并在 `main.tsx` 引入。此步只新增不改动，零回归。
3. **组件逐个重写**：按依赖从浅到深顺序——`FileUploader` → `YAMLEditor` → `StatsPanel` → `TemplateManager` → `YAMLVisualizer`（工具栏）→ `YAMLForm`（最重）。每完成一个组件即可独立验证（视觉 + 功能）。
4. **Monaco 自定义主题**：在 `YAMLEditor.tsx` 中 `defineTheme('yameilo-dark')` 与 `yameilo-light`，并随主题切换联动。
5. **清理**：全部组件迁移完成后，移除旧变量名别名与组件中遗留的硬编码值（`rgba(59,130,246,...)`、`6px`、`JetBrains Mono` 直引等）。

### 5.3 验收标准
- **视觉**：暗色下整体呈现 `#08090a` 画布 + 薄边框 + 蓝绿粉青点缀的 Linear 质感；亮色为镜像克制版。无重阴影、无渐变、圆角柔和。
- **双主题**：亮/暗切换无错色、无残留硬编码颜色；切换过渡顺滑。
- **一致性**：所有按钮/输入框/卡片/chip 视觉统一，来自基元类与 token，无重复定义。
- **功能回归**：上文"明确边界"中列出的全部功能逐一通过手动验证；Monaco 编辑器语法高亮、搜索、路径高亮正常。
- **响应式**：`640 / 768 / 1024 / 1280` 四档断点下布局正常，工具栏在窄屏收为图标按钮。
- **可访问性**：focus ring 可见；`prefers-reduced-motion` 下动画降为瞬时；颜色对比度满足 WCAG AA（正文对背景）。
- **构建**：`npm run build`（`tsc && vite build`）通过，无类型错误。

### 5.4 验证方式
- 项目当前无自动化测试框架，采用**人工核对清单**：按"明确边界"功能列表逐项在亮/暗两套主题下走查，并对照 `design.md` 风格关键词验收。
- 开发期 `npm run dev` 实时预览；构建后 `npm run preview` 验证生产产物。
