# 保存当前内容为模板 - 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 启用并增强 `TemplateManager` 的"保存当前内容为模板"功能，让用户能将当前编辑的配置保存为浏览器内模板，按创建时间倒序展示，重名可覆盖，保存成功用 toast 提示。

**Architecture:** 改动集中在 `TemplateManager.tsx`：移除未使用的 `onSaveAsTemplate` prop 让保存按钮始终显示；新增按 `createdAt` 降序排序；重名时弹内联覆盖确认（保留原 id/createdAt）；用组件内 toast 替代 `alert`，应用模板的 `confirm` 改为内联确认 UI。`YAMLVisualizer.tsx` 仅清理 prop 传递（如有）。

**Tech Stack:** React 18 + TypeScript + Vite。无测试框架（项目未配置），验证方式：`npm run build`（含 `tsc` 类型检查）+ 手工验证清单。

**Spec:** `docs/superpowers/specs/2026-06-27-save-as-template-design.md`

---

## File Structure

| 文件 | 改动类型 | 责任 |
|---|---|---|
| `src/components/TemplateManager.tsx` | 修改 | 移除 `onSaveAsTemplate` prop、按 createdAt 倒序、重名覆盖、toast、应用模板内联确认 |
| `src/components/TemplateManager.css` | 修改 | 新增覆盖确认提示条样式、应用确认样式 |
| `src/components/YAMLVisualizer.tsx` | 修改 | 无需新传 prop（TemplateManager 自包含）；本计划不动该文件，除非发现需要清理 |

---

### Task 1: 移除 `onSaveAsTemplate` prop，让保存按钮始终显示

**Files:**
- Modify: `src/components/TemplateManager.tsx`

- [ ] **Step 1: 从 props 接口删除 `onSaveAsTemplate`**

在 `src/components/TemplateManager.tsx` 中，找到接口定义：

```ts
interface TemplateManagerProps {
  currentData: any
  onApplyTemplate: (data: any) => void
  onSaveAsTemplate?: (name: string, description: string, data: any) => void
}
```

改为：

```ts
interface TemplateManagerProps {
  currentData: any
  onApplyTemplate: (data: any) => void
}
```

- [ ] **Step 2: 从解构中删除 `onSaveAsTemplate`**

找到：

```ts
export default function TemplateManager({ currentData, onApplyTemplate, onSaveAsTemplate }: TemplateManagerProps) {
```

改为：

```ts
export default function TemplateManager({ currentData, onApplyTemplate }: TemplateManagerProps) {
```

- [ ] **Step 3: 移除保存按钮的条件渲染**

找到：

```tsx
{/* 保存当前配置为模板 */}
{onSaveAsTemplate && (
  <div className="template-section">
    <button
      className="template-save-btn"
      onClick={() => setShowSaveDialog(true)}
    >
      <PlusIcon size={14} />
      <span>保存当前配置为模板</span>
    </button>
  </div>
)}
```

改为（去掉 `{onSaveAsTemplate && (...)}` 包裹，保留内层 JSX）：

```tsx
{/* 保存当前配置为模板 */}
<div className="template-section">
  <button
    className="template-save-btn"
    onClick={() => setShowSaveDialog(true)}
  >
    <PlusIcon size={14} />
    <span>保存当前配置为模板</span>
  </button>
</div>
```

- [ ] **Step 4: 检查 `YAMLVisualizer.tsx` 是否需要清理**

运行：`rg -n "onSaveAsTemplate" src/`
预期：无匹配（接口删除后不应再有引用）。如有匹配，删除对应传递。

- [ ] **Step 5: 类型检查 + 构建验证**

Run: `npm run build`
Expected: 编译通过，无 TS 错误。

- [ ] **Step 6: Commit**

```bash
git add src/components/TemplateManager.tsx src/components/YAMLVisualizer.tsx
git commit -m "feat(template): 启用保存当前配置为模板按钮"
```

---

### Task 2: 用户模板按 `createdAt` 降序排序

**Files:**
- Modify: `src/components/TemplateManager.tsx`

- [ ] **Step 1: 新增排序辅助函数**

在 `STORAGE_KEY` 常量定义之后、`TemplateManagerProps` 接口之前，加入：

```ts
const sortByCreatedAtDesc = (templates: Template[]): Template[] =>
  [...templates].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
```

- [ ] **Step 2: 加载时排序**

找到加载用户模板的 `useEffect`：

```ts
useEffect(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const templates = JSON.parse(saved) as Template[]
      setUserTemplates(templates)
    }
  } catch (error) {
  }
}, [])
```

改为：

```ts
useEffect(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const templates = JSON.parse(saved) as Template[]
      setUserTemplates(sortByCreatedAtDesc(templates))
    }
  } catch (error) {
  }
}, [])
```

- [ ] **Step 3: `saveTemplates` 内排序**

找到：

```ts
const saveTemplates = useCallback((templates: Template[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
    setUserTemplates(templates)
  } catch (error) {
    alert('保存模板失败，可能是存储空间不足')
  }
}, [])
```

改为：

```ts
const saveTemplates = useCallback((templates: Template[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
    setUserTemplates(sortByCreatedAtDesc(templates))
  } catch (error) {
    alert('保存模板失败，可能是存储空间不足')
  }
}, [])
```

- [ ] **Step 4: 类型检查**

Run: `npm run build`
Expected: 通过。

- [ ] **Step 5: Commit**

```bash
git add src/components/TemplateManager.tsx
git commit -m "feat(template): 用户模板按创建时间倒序显示"
```

---

### Task 3: 新增 toast 基础设施（状态、showToast、渲染）

**Files:**
- Modify: `src/components/TemplateManager.tsx`

> 说明：`YAMLForm.css` 中已有 `.toast-message` 样式，Vite 默认 CSS 全局生效，`TemplateManager` 中可直接用 `.toast-message` 类，无需在 `TemplateManager.css` 重复定义。本任务只搭好 toast 基础设施，后续任务（重名覆盖、保存成功提示）会调用 `showToast`。

- [ ] **Step 1: 新增 toast 状态**

在 `showDeleteConfirm` 状态附近新增：

```ts
const [toastMessage, setToastMessage] = useState<string>('')
const toastTimeoutRef = useRef<number | null>(null)
```

确认顶部已 import `useRef`（现有代码已 import，无需改动）。

- [ ] **Step 2: 新增 `showToast` 函数与清理 effect**

在 `saveTemplates` 之后新增：

```ts
const showToast = useCallback((message: string) => {
  setToastMessage(message)
  if (toastTimeoutRef.current) {
    clearTimeout(toastTimeoutRef.current)
  }
  toastTimeoutRef.current = window.setTimeout(() => {
    setToastMessage('')
    toastTimeoutRef.current = null
  }, 2000)
}, [])

useEffect(() => {
  return () => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }
  }
}, [])
```

- [ ] **Step 3: 在组件根 fragment 末尾渲染 toast**

找到组件最后的 `</>` 闭合（保存对话框 JSX 之后）：

```tsx
      )}
    </>
  )
}
```

在 `)}` 与 `</>` 之间插入：

```tsx
      {toastMessage && (
        <div className="toast-message">
          {toastMessage}
        </div>
      )}
```

最终片段：

```tsx
      )}
      {toastMessage && (
        <div className="toast-message">
          {toastMessage}
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 4: 类型检查 + 构建**

Run: `npm run build`
Expected: 通过。

- [ ] **Step 5: Commit**

```bash
git add src/components/TemplateManager.tsx
git commit -m "feat(template): 引入 toast 提示基础设施"
```

---

### Task 4: 重名覆盖确认

**Files:**
- Modify: `src/components/TemplateManager.tsx`
- Modify: `src/components/TemplateManager.css`

- [ ] **Step 1: 新增 `overwriteConfirmName` 状态**

找到现有的状态声明区域（`showDeleteConfirm` 附近）：

```ts
const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
```

在其下方新增：

```ts
const [overwriteConfirmName, setOverwriteConfirmName] = useState<string | null>(null)
```

- [ ] **Step 2: 重写 `handleSaveTemplate` 处理重名**

找到现有 `handleSaveTemplate`：

```ts
const handleSaveTemplate = useCallback(() => {
  if (!templateName.trim()) {
    alert('请输入模板名称')
    return
  }

  const newTemplate: Template = {
    id: `user-${Date.now()}`,
    name: templateName.trim(),
    description: templateDescription.trim() || undefined,
    data: currentData,
    isPreset: false,
    createdAt: Date.now()
  }

  const updatedTemplates = [...userTemplates, newTemplate]
  saveTemplates(updatedTemplates)
  
  setTemplateName('')
  setTemplateDescription('')
  setShowSaveDialog(false)
  alert('模板保存成功！')
}, [templateName, templateDescription, currentData, userTemplates, saveTemplates])
```

替换为（分两个函数：尝试保存 + 确认覆盖）：

```ts
// 尝试保存：检测重名，若重名进入覆盖确认流程
const handleSaveTemplate = useCallback(() => {
  if (!templateName.trim()) {
    alert('请输入模板名称')
    return
  }

  const trimmedName = templateName.trim()
  const existing = userTemplates.find(t => t.name.trim() === trimmedName)
  if (existing) {
    setOverwriteConfirmName(trimmedName)
    return
  }

  const newTemplate: Template = {
    id: `user-${Date.now()}`,
    name: trimmedName,
    description: templateDescription.trim() || undefined,
    data: currentData,
    isPreset: false,
    createdAt: Date.now()
  }

  saveTemplates([...userTemplates, newTemplate])
  resetSaveDialog()
  showToast('模板已保存')
}, [templateName, templateDescription, currentData, userTemplates, saveTemplates])

// 确认覆盖：保留原 id/createdAt，更新 data 和 description
const handleConfirmOverwrite = useCallback(() => {
  if (!overwriteConfirmName) return

  const updatedTemplates = userTemplates.map(t =>
    t.name.trim() === overwriteConfirmName
      ? { ...t, data: currentData, description: templateDescription.trim() || undefined }
      : t
  )
  saveTemplates(updatedTemplates)
  setOverwriteConfirmName(null)
  resetSaveDialog()
  showToast('模板已更新')
}, [overwriteConfirmName, userTemplates, currentData, templateDescription, saveTemplates])
```

- [ ] **Step 3: 新增 `resetSaveDialog` 辅助函数**

在 `handleSaveTemplate` 之前新增：

```ts
const resetSaveDialog = useCallback(() => {
  setTemplateName('')
  setTemplateDescription('')
  setShowSaveDialog(false)
}, [])
```

- [ ] **Step 4: 在保存对话框中渲染覆盖确认提示条**

找到保存对话框的 footer 部分：

```tsx
<div className="template-save-dialog-footer">
  <button
    className="btn btn-secondary"
    onClick={() => {
      setShowSaveDialog(false)
      setTemplateName('')
      setTemplateDescription('')
    }}
  >
    取消
  </button>
  <button
    className="btn btn-primary"
    onClick={handleSaveTemplate}
    disabled={!templateName.trim()}
  >
    保存
  </button>
</div>
```

替换为（在 footer 上方插入覆盖确认提示条，footer 中的取消按钮逻辑统一用 `resetSaveDialog`，保存按钮在覆盖确认期间禁用）：

```tsx
{overwriteConfirmName && (
  <div className="template-overwrite-confirm">
    <div className="template-overwrite-confirm-text">
      已存在同名模板「{overwriteConfirmName}」，是否覆盖？
    </div>
    <div className="template-overwrite-confirm-actions">
      <button
        className="template-overwrite-confirm-no"
        onClick={() => setOverwriteConfirmName(null)}
      >
        取消
      </button>
      <button
        className="template-overwrite-confirm-yes"
        onClick={handleConfirmOverwrite}
      >
        覆盖保存
      </button>
    </div>
  </div>
)}
<div className="template-save-dialog-footer">
  <button
    className="btn btn-secondary"
    onClick={resetSaveDialog}
    disabled={!!overwriteConfirmName}
  >
    取消
  </button>
  <button
    className="btn btn-primary"
    onClick={handleSaveTemplate}
    disabled={!templateName.trim() || !!overwriteConfirmName}
  >
    保存
  </button>
</div>
```

- [ ] **Step 5: 关闭对话框时清空覆盖确认状态**

找到关闭对话框的两处地方（header 的关闭按钮 onClick、取消按钮 onClick），将：

```tsx
onClick={() => {
  setShowSaveDialog(false)
  setTemplateName('')
  setTemplateDescription('')
}}
```

替换为调用 `resetSaveDialog`：

```tsx
onClick={resetSaveDialog}
```

并在 `resetSaveDialog` 中也清掉覆盖状态。更新 `resetSaveDialog`：

```ts
const resetSaveDialog = useCallback(() => {
  setTemplateName('')
  setTemplateDescription('')
  setShowSaveDialog(false)
  setOverwriteConfirmName(null)
}, [])
```

- [ ] **Step 6: 新增覆盖确认提示条 CSS**

在 `src/components/TemplateManager.css` 末尾追加：

```css
.template-overwrite-confirm {
  padding: var(--space-3) var(--space-5);
  background: var(--accent-attention-bg);
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.template-overwrite-confirm-text {
  font-size: var(--text-sm);
  color: var(--text-primary);
  line-height: var(--lh-regular);
}

.template-overwrite-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.template-overwrite-confirm-yes,
.template-overwrite-confirm-no {
  padding: 4px 12px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: var(--fw-medium);
  cursor: pointer;
  transition: background-color var(--speed-quick) var(--ease);
}

.template-overwrite-confirm-yes {
  background: var(--accent-attention);
  color: var(--on-accent);
}
.template-overwrite-confirm-yes:hover {
  background: var(--accent-attention-hover);
}

.template-overwrite-confirm-no {
  background: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--border);
}
.template-overwrite-confirm-no:hover {
  background: var(--bg-active);
}
```

- [ ] **Step 7: 类型检查 + 构建**

Run: `npm run build`
Expected: 通过。

- [ ] **Step 8: Commit**

```bash
git add src/components/TemplateManager.tsx src/components/TemplateManager.css
git commit -m "feat(template): 保存模板时重名弹内联确认覆盖"
```

---

### Task 5: 应用模板改用内联确认（替代浏览器 `confirm`）

**Files:**
- Modify: `src/components/TemplateManager.tsx`
- Modify: `src/components/TemplateManager.css`

- [ ] **Step 1: 新增 `applyConfirmId` 状态**

在 `overwriteConfirmName` 状态附近新增：

```ts
const [applyConfirmId, setApplyConfirmId] = useState<string | null>(null)
```

- [ ] **Step 2: 重写 `handleApplyTemplate`**

找到：

```ts
const handleApplyTemplate = useCallback((template: Template) => {
  if (confirm('应用模板将替换当前配置，是否继续？')) {
    onApplyTemplate(template.data)
    setIsOpen(false)
  }
}, [onApplyTemplate])
```

改为（先进入内联确认状态，由确认按钮真正执行应用）：

```ts
const handleApplyTemplate = useCallback((template: Template) => {
  setApplyConfirmId(template.id)
}, [])

const handleConfirmApply = useCallback((template: Template) => {
  onApplyTemplate(template.data)
  setApplyConfirmId(null)
  setIsOpen(false)
}, [onApplyTemplate])
```

- [ ] **Step 3: 在预设模板和用户模板的"应用"按钮处替换为内联确认 UI**

预设模板部分，找到：

```tsx
<button
  className="template-item-apply"
  onClick={() => handleApplyTemplate(template)}
  title="应用模板"
>
  应用
</button>
```

替换为：

```tsx
{applyConfirmId === template.id ? (
  <div className="template-apply-confirm">
    <span className="template-apply-confirm-text">替换当前配置？</span>
    <button
      className="template-apply-confirm-yes"
      onClick={() => handleConfirmApply(template)}
    >
      确认
    </button>
    <button
      className="template-apply-confirm-no"
      onClick={() => setApplyConfirmId(null)}
    >
      取消
    </button>
  </div>
) : (
  <button
    className="template-item-apply"
    onClick={() => handleApplyTemplate(template)}
    title="应用模板"
  >
    应用
  </button>
)}
```

用户模板部分，找到（在 `template-item-actions` div 内）：

```tsx
<button
  className="template-item-apply"
  onClick={() => handleApplyTemplate(template)}
  title="应用模板"
>
  应用
</button>
{showDeleteConfirm === template.id ? (
  ...删除确认...
) : (
  <button ...删除... />
)}
```

将"应用"按钮替换为同样的内联确认 UI（与预设模板相同的结构），删除确认部分保持不变：

```tsx
{applyConfirmId === template.id ? (
  <div className="template-apply-confirm">
    <span className="template-apply-confirm-text">替换当前配置？</span>
    <button
      className="template-apply-confirm-yes"
      onClick={() => handleConfirmApply(template)}
    >
      确认
    </button>
    <button
      className="template-apply-confirm-no"
      onClick={() => setApplyConfirmId(null)}
    >
      取消
    </button>
  </div>
) : (
  <button
    className="template-item-apply"
    onClick={() => handleApplyTemplate(template)}
    title="应用模板"
  >
    应用
  </button>
)}
{showDeleteConfirm === template.id ? (
  ...删除确认保持不变...
) : (
  <button ...删除... />
)}
```

- [ ] **Step 4: 关闭菜单时清空应用确认状态**

找到关闭菜单的 `setIsOpen(false)` 调用处（菜单 header 的关闭按钮、`handleConfirmApply` 内已加）。在 `handleClickOutside` 中关闭菜单时也清空：

```ts
const handleClickOutside = (event: MouseEvent) => {
  if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
    setIsOpen(false)
  }
  ...
}
```

改为：

```ts
const handleClickOutside = (event: MouseEvent) => {
  if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
    setIsOpen(false)
    setApplyConfirmId(null)
  }
  ...
}
```

- [ ] **Step 5: 新增应用确认 UI 的 CSS**

在 `src/components/TemplateManager.css` 末尾追加：

```css
.template-apply-confirm {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.template-apply-confirm-text {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  margin-right: var(--space-1);
  white-space: nowrap;
}

.template-apply-confirm-yes,
.template-apply-confirm-no {
  padding: 2px 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-xs);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: var(--fw-medium);
  cursor: pointer;
  transition: background-color var(--speed-quick) var(--ease);
}

.template-apply-confirm-yes {
  background: var(--accent-attention);
  color: var(--on-accent);
}
.template-apply-confirm-yes:hover {
  background: var(--accent-attention-hover);
}

.template-apply-confirm-no {
  background: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--border);
}
.template-apply-confirm-no:hover {
  background: var(--bg-active);
}
```

- [ ] **Step 6: 类型检查 + 构建**

Run: `npm run build`
Expected: 通过。

- [ ] **Step 7: Commit**

```bash
git add src/components/TemplateManager.tsx src/components/TemplateManager.css
git commit -m "feat(template): 应用模板改用内联确认替代浏览器 confirm"
```

---

### Task 6: 手工验证

**Files:** 无（运行项目验证）

- [ ] **Step 1: 启动 dev server**

Run: `npm run dev`
在浏览器打开 Vite 提示的本地地址。

- [ ] **Step 2: 按以下清单手工验证**

依次验证（参考 spec 测试计划）：

1. 模板菜单按钮可见，点击后菜单中"保存当前配置为模板"按钮显示。
2. 点击"保存当前配置为模板" → 弹出对话框，输入名称"t1"保存 → 显示 toast"模板已保存"，"我的模板"区出现 t1。
3. 再保存"t2"、"t3" → 顺序为 t3、t2、t1（最新在最上）。
4. 用"t2"再次保存（内容可改动）→ 出现覆盖确认提示条 → 点"覆盖保存" → toast"模板已更新"，t2 位置不变（仍排在 t3 之下、t1 之上），条目数仍为 3。
5. 用"t2"保存 → 出现覆盖确认 → 点"取消" → 回到对话框可继续编辑。
6. 刷新页面 → 模板仍在，顺序仍为 t3、t2、t1。
7. 点击任一模板的"应用" → 出现"替换当前配置？确认/取消"内联按钮 → 点"确认" → 当前编辑区被替换为模板内容，菜单关闭。
8. 点击"应用" → 点"取消" → 确认按钮收起，菜单不关闭。
9. 点击模板的删除按钮 → 内联确认正常工作（已有功能不回归）。
10. 清空 localStorage（DevTools → Application → Local Storage → 删除 `yameilo-templates`）后刷新 → 显示"暂无模板，可以保存当前配置为模板"。

- [ ] **Step 3: 全量类型 + 构建最终验证**

Run: `npm run build`
Expected: 通过，无警告。

---

## Self-Review

**1. Spec coverage:**
- 启用保存按钮 → Task 1 ✓
- 倒序排序 → Task 2 ✓
- toast 替代 alert（基础设施 + 保存成功提示） → Task 3 ✓
- 重名覆盖（保留 id/createdAt） → Task 4 ✓
- 应用模板内联确认 → Task 5 ✓
- 测试计划清单 → Task 6 ✓

**2. Placeholder scan:** 所有步骤均含具体代码/命令，无 TBD/TODO。

**3. Type consistency:**
- `sortByCreatedAtDesc` 在 Task 2 定义，Task 2 内使用 ✓
- `showToast` 在 Task 3 Step 2 定义，Task 4（`handleSaveTemplate` / `handleConfirmOverwrite`）使用 ✓
- `resetSaveDialog` 在 Task 4 Step 3 定义并在 Step 3 中包含 `setOverwriteConfirmName(null)`，Task 4 Step 4/5 使用 ✓
- `overwriteConfirmName` / `applyConfirmId` 在 Task 4 / Task 5 定义并使用 ✓
- `handleConfirmOverwrite` / `handleConfirmApply` 定义与使用一致 ✓

**4. 执行顺序：** Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6。Task 3（toast 基础设施）先于 Task 4（重名覆盖），保证 `showToast` 在被引用前已定义，每个 task 提交后 `npm run build` 均能通过。
