# 保存当前内容为模板 - 设计文档

日期：2026-06-27
状态：已通过设计评审，待实现

## 背景

`TemplateManager` 组件已存在"保存当前配置为模板"的对话框与 `localStorage` 持久化逻辑，但存在以下问题：

1. **保存按钮不可见**：`YAMLVisualizer.tsx` 中使用 `<TemplateManager currentData={data} onApplyTemplate={handleApplyTemplate} />`，未传 `onSaveAsTemplate` prop。而 `TemplateManager` 内部以 `{onSaveAsTemplate && (...)}` 作为渲染条件，导致"保存当前配置为模板"按钮永远不会显示。
2. **未按创建时间倒序**：当前实现为 `[...userTemplates, newTemplate]` 直接追加，显示顺序是最旧的在最上面，不符合"按新建时间倒序"的预期。
3. **重名直接新增**：未做重名检测，会出现多个同名模板。
4. **使用浏览器原生 alert/confirm**：与项目其他部分（如复制路径的 toast、删除模板的内联确认）体验不一致。

## 目标

- 启用"保存当前内容为模板"功能，入口可见可用
- 用户模板按 `createdAt` 降序显示（最新创建的在最上面）
- 重名时弹窗确认覆盖（保留原 `createdAt`，更新 `data`/`description`，不新增条目）
- 保存成功用页面内 toast 提示
- 应用模板、删除模板的确认改用内联弹层，与项目其他部分体验一致

## 非目标

- 不增加导入/导出模板功能
- 不增加模板分类/标签/搜索
- 不改动预设模板内容
- 不改动 `YAMLForm` / `YAMLVisualizer` 的其他行为

## 涉及文件

| 文件 | 改动类型 | 说明 |
|---|---|---|
| `src/components/TemplateManager.tsx` | 修改 | 主要逻辑改动 |
| `src/components/TemplateManager.css` | 修改 | 新增重名覆盖提示条样式 |
| `src/components/YAMLVisualizer.tsx` | 修改 | 无需改 prop（TemplateManager 自包含）；如需清理可顺手去掉未使用的 prop 传递 |

## 数据模型

`Template` 接口保持不变：

```ts
export interface Template {
  id: string
  name: string
  description?: string
  data: any
  isPreset?: boolean
  createdAt?: number
}
```

`localStorage` key 不变：`yameilo-templates`。

## 详细设计

### 1. 启用保存按钮

- `TemplateManager` 内部已经自包含保存逻辑，`onSaveAsTemplate` prop 实际从未被调用（只是被用作显示开关）。
- 从 `TemplateManagerProps` 接口中删除 `onSaveAsTemplate` 字段。
- 移除 `{onSaveAsTemplate && (...)}` 条件，"保存当前配置为模板"按钮始终显示。

### 2. 倒序排序

- 引入辅助函数，加载与保存后都对用户模板按 `createdAt` 降序排序：

  ```ts
  const sortByCreatedAtDesc = (templates: Template[]): Template[] =>
    [...templates].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
  ```

- `useEffect` 加载后：`setUserTemplates(sortByCreatedAtDesc(parsed))`
- `saveTemplates` 内：`setUserTemplates(sortByCreatedAtDesc(templates))`（持久化数组仍按传入顺序保存，排序只影响显示与内存状态）
- 新保存的模板因 `createdAt = Date.now()` 最大，自然出现在最上方。
- 预设模板不参与排序，仍按原数组顺序显示在"预设模板"区块。

### 3. 重名覆盖

- 重名判定：`name` 经过 `trim()` 后严格相等（区分大小写）。
- 保存时若发现 `userTemplates` 中存在同名模板：
  - 在对话框底部显示内联提示条：`"已存在同名模板「xxx」，是否覆盖？"` + "覆盖保存" / "取消" 按钮。
  - 状态：`overwriteConfirmName: string | null`，记录待确认的重名名称。
  - 用户点击"覆盖保存"：
    - 找到该同名模板，更新其 `data` 和 `description`，**保留原 `id` 和 `createdAt`**，不新增条目。
    - 关闭对话框，显示 toast。
  - 用户点击"取消"：回到对话框，让用户改名后再保存。
- 不重名时正常新增。

### 4. Toast 替代 alert/confirm

- 在 `TemplateManager` 内新增：
  - `toastMessage: string` state
  - `toastTimeoutRef` ref
  - `showToast(message: string)` 函数（2 秒后自动清除）
- 复用 `YAMLForm.css` 中已有的 `.toast-message` 样式，不重复定义。
- toast 元素渲染在组件根 fragment 内（`position: fixed`，不依赖父布局）。
- 应用场景：
  - 保存成功 → "模板已保存"
  - 覆盖成功 → "模板已更新"
- 应用模板的确认：从 `confirm()` 改为内联确认 UI（沿用现有删除确认 `template-delete-confirm` 风格），用一个 `applyConfirmId: string | null` 状态记录待确认应用的模板 id。
- 删除模板已有内联确认，保持不变。

### 5. 流程示意

**保存流程：**
```
点击"保存当前配置为模板" → 打开对话框
  → 输入名称/描述，点击"保存"
    → 重名？
      是 → 显示覆盖确认提示条
        → "覆盖保存" → 更新原模板（保留 id/createdAt）→ 关闭对话框 → toast "模板已更新"
        → "取消" → 回到对话框让用户改名
      否 → 新增模板 → 关闭对话框 → toast "模板已保存"
```

**应用流程：**
```
点击模板的"应用"按钮 → 显示内联确认（"应用此模板将替换当前配置" + 确认/取消）
  → 确认 → onApplyTemplate(data) → 关闭菜单
  → 取消 → 收起确认
```

## 测试计划

手工验证：

1. 保存按钮可见，点击打开对话框
2. 输入名称保存 → toast "模板已保存" + 模板出现在"我的模板"最上方
3. 重复保存多个模板，顺序始终是最新在最上
4. 用已存在名称保存 → 出现覆盖确认提示条 → 点"覆盖保存" → 模板内容更新但创建时间不变、不新增条目 → toast "模板已更新"
5. 用已存在名称保存 → 点"取消" → 回到对话框可改名
6. 刷新页面，模板仍在且顺序正确（最新在最上）
7. 应用模板：点击"应用" → 内联确认 → 确认后当前配置被替换、菜单关闭
8. 删除模板：内联确认正常工作（已有功能，不应回归）
9. 空模板列表时仍显示"暂无模板，可以保存当前配置为模板"

## 风险与权衡

- **重名比较策略**：使用 trim 后严格相等。若用户希望忽略大小写，可在后续迭代调整。当前选择避免"dev" 和 "Dev" 被误判为重名。
- **覆盖时保留 createdAt**：让"倒序"顺序在覆盖后保持稳定，避免覆盖后模板跳到最上方造成困惑。如用户希望覆盖也算"更新时间"排序，可在后续迭代增加 `updatedAt` 字段。
- **不引入新 prop**：删除 `onSaveAsTemplate` 会让该 prop 完全消失，但当前无人传递它，无破坏性影响。
