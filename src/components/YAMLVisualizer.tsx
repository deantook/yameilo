import { useState, useCallback, useEffect, useRef } from 'react'
import * as YAML from 'yaml'
import * as TOML from '@iarna/toml'
import { js2xml } from 'xml-js'
import { useTheme } from '../contexts/ThemeContext'
import YAMLForm, { YAMLFormHandle } from './YAMLForm'
import YAMLEditor, { YAMLEditorHandle } from './YAMLEditor'
import StatsPanel from './StatsPanel'
import { FileIcon, SortIcon, SaveIcon, ReloadIcon, UploadIcon, ChevronDownIcon, ChevronRightIcon, FormatIcon, SearchIcon, CloseIcon, MoonIcon, SunIcon, GitHubIcon, DownloadIcon, StatsIcon } from './Icons'
import './YAMLVisualizer.css'

interface YAMLVisualizerProps {
  data: any
  fileName: string
  onDataChange: (data: any) => void
  onFileLoad: (data: any, fileName: string) => void
  onReset: () => void
}

export default function YAMLVisualizer({
  data,
  fileName,
  onDataChange,
  onFileLoad,
  onReset,
}: YAMLVisualizerProps) {
  const { theme, toggleTheme } = useTheme()
  const [yamlText, setYamlText] = useState('')
  const [parseError, setParseError] = useState('')
  const [isAllExpanded, setIsAllExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [matchCount, setMatchCount] = useState(0)
  const [editingFileName, setEditingFileName] = useState(fileName || '')
  const [isEditingFileName, setIsEditingFileName] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showStatsPanel, setShowStatsPanel] = useState(false)
  const [isStatsPanelExpanded, setIsStatsPanelExpanded] = useState(false)
  const fileNameInputRef = useRef<HTMLInputElement>(null)
  const isUpdatingFromForm = useRef(false)
  const isUpdatingFromEditor = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<YAMLFormHandle | null>(null)
  const editorRef = useRef<YAMLEditorHandle | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const yamlDocRef = useRef<YAML.Document | null>(null) // 保存 YAML 文档以保留注释

  // 将 JavaScript 值转换为 YAML 节点
  const valueToNode = useCallback((value: any): YAML.Node | null => {
    try {
      const doc = YAML.parseDocument(YAML.stringify(value, { indent: 2 }))
      return doc.contents || null
    } catch {
      return null
    }
  }, [])

  // 递归更新 YAML 节点值，保留注释
  const updateNodeValue = useCallback((oldNode: YAML.Node | null, newValue: any): YAML.Node | null => {
    if (newValue === null || newValue === undefined) {
      return valueToNode(newValue)
    }

    // 如果是 Map（对象）
    if (YAML.isMap(oldNode) && typeof newValue === 'object' && !Array.isArray(newValue)) {
      const oldMap = oldNode as YAML.YAMLMap
      const newMap = new YAML.YAMLMap()
      
      // 保留 Map 的注释
      if (oldMap.commentBefore) newMap.commentBefore = oldMap.commentBefore
      if (oldMap.comment) newMap.comment = oldMap.comment
      
      // 创建键到旧 Pair 的映射
      const oldPairs = new Map<string, YAML.Pair>()
      oldMap.items.forEach(pair => {
        if (YAML.isScalar(pair.key)) {
          const key = (pair.key as YAML.Scalar).value as string
          oldPairs.set(key, pair)
        }
      })
      
      // 更新或添加键值对
      Object.keys(newValue).forEach(key => {
        const oldPair = oldPairs.get(key)
        const oldValue = (oldPair?.value as YAML.Node | undefined) || null
        const newValueNode = updateNodeValue(oldValue, newValue[key])
        
        if (newValueNode) {
          const newPair = new YAML.Pair(
            oldPair?.key || valueToNode(key) as YAML.Scalar,
            newValueNode
          )
          
          // 保留 Pair 的注释（使用类型断言，因为类型定义可能不完整）
          if (oldPair) {
            const oldPairAny = oldPair as any
            const newPairAny = newPair as any
            if (oldPairAny.commentBefore) newPairAny.commentBefore = oldPairAny.commentBefore
            if (oldPairAny.comment) newPairAny.comment = oldPairAny.comment
            // 保留 key 的注释
            if (oldPair.key && YAML.isScalar(oldPair.key)) {
              const oldKey = oldPair.key as YAML.Scalar
              const oldKeyAny = oldKey as any
              if (YAML.isScalar(newPair.key)) {
                const newKeyAny = newPair.key as any
                if (oldKeyAny.commentBefore) newKeyAny.commentBefore = oldKeyAny.commentBefore
                if (oldKeyAny.comment) newKeyAny.comment = oldKeyAny.comment
              }
            }
          }
          
          newMap.items.push(newPair)
        }
      })
      
      return newMap
    }
    
    // 如果是 Seq（数组）
    if (YAML.isSeq(oldNode) && Array.isArray(newValue)) {
      const oldSeq = oldNode as YAML.YAMLSeq
      const newSeq = new YAML.YAMLSeq()
      
      // 保留 Seq 的注释
      if (oldSeq.commentBefore) newSeq.commentBefore = oldSeq.commentBefore
      if (oldSeq.comment) newSeq.comment = oldSeq.comment
      
      // 更新数组项
      newValue.forEach((item, index) => {
        const oldItem = (oldSeq.items[index] as YAML.Node | undefined) || null
        const newItem = updateNodeValue(oldItem, item)
        
        if (newItem) {
          // 保留项的注释（使用类型断言）
          if (oldItem) {
            const oldItemAny = oldItem as any
            const newItemAny = newItem as any
            if (oldItemAny.commentBefore) newItemAny.commentBefore = oldItemAny.commentBefore
            if (oldItemAny.comment) newItemAny.comment = oldItemAny.comment
          }
          
          newSeq.items.push(newItem)
        }
      })
      
      return newSeq
    }
    
    // 如果是 Scalar（标量值）或其他类型
    if (YAML.isScalar(oldNode)) {
      const oldScalar = oldNode as YAML.Scalar
      const newScalar = valueToNode(newValue) as YAML.Scalar
      
      if (newScalar && YAML.isScalar(newScalar)) {
        // 保留标量的注释
        if (oldScalar.commentBefore) newScalar.commentBefore = oldScalar.commentBefore
        if (oldScalar.comment) newScalar.comment = oldScalar.comment
        return newScalar
      }
    }
    
    // 默认情况：创建新节点
    return valueToNode(newValue)
  }, [valueToNode])

  // 将数据转换为 YAML 文本，保留注释
  const dataToYaml = useCallback((data: any, preserveComments: boolean = false): string => {
    try {
      // 如果是空对象，返回空字符串
      if (data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0) {
        return ''
      }
      
      // 如果要求保留注释且存在文档，尝试更新文档内容
      if (preserveComments && yamlDocRef.current) {
        try {
          // 使用递归更新来保留注释
          const updatedContents = updateNodeValue(yamlDocRef.current.contents, data)
          if (updatedContents) {
            yamlDocRef.current.contents = updatedContents
            return yamlDocRef.current.toString()
          }
        } catch (error) {
          // 如果更新失败，回退到普通序列化
          console.warn('Failed to preserve comments, using standard serialization:', error)
        }
      }
      
      // 普通序列化（不保留注释）
      return YAML.stringify(data, { indent: 2 })
    } catch (error) {
      return yamlText || ''
    }
  }, [yamlText, updateNodeValue])

  // 初始化 YAML 文本（仅在数据首次加载时）
  const isInitialized = useRef(false)
  useEffect(() => {
    if (!isInitialized.current && data !== null && data !== undefined) {
      const newYamlText = dataToYaml(data)
      setYamlText(newYamlText)
      isInitialized.current = true
    }
  }, [data, dataToYaml])

  // 当数据变化时重置展开状态
  useEffect(() => {
    setIsAllExpanded(false)
  }, [data])

  // 当外部 fileName 变化时更新编辑中的文件名
  useEffect(() => {
    if (fileName) {
      setEditingFileName(fileName)
    }
  }, [fileName])

  // 处理文件名编辑
  const handleFileNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingFileName(e.target.value)
  }, [])

  const handleFileNameBlur = useCallback(() => {
    setIsEditingFileName(false)
    // 确保文件名有 .yaml 或 .yml 扩展名
    let finalFileName = editingFileName.trim()
    if (finalFileName && !finalFileName.match(/\.(yaml|yml)$/i)) {
      finalFileName = finalFileName + '.yaml'
    }
    if (!finalFileName) {
      finalFileName = '未命名文件.yaml'
    }
    setEditingFileName(finalFileName)
  }, [editingFileName])

  const handleFileNameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    } else if (e.key === 'Escape') {
      setEditingFileName(fileName || '未命名文件.yaml')
      setIsEditingFileName(false)
    }
  }, [fileName])

  const handleFileNameClick = useCallback(() => {
    setIsEditingFileName(true)
    setTimeout(() => {
      fileNameInputRef.current?.focus()
      fileNameInputRef.current?.select()
    }, 0)
  }, [])

  // 快捷键支持：Ctrl+F 聚焦搜索框
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchQuery('')
        setMatchCount(0)
        searchInputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 处理文件上传
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      // 使用 parseDocument 以保留注释
      const doc = YAML.parseDocument(text)
      const parsedData = doc.toJS()
      if (parsedData !== undefined) {
        yamlDocRef.current = doc // 保存文档以保留注释
        onFileLoad(parsedData, file.name)
        setYamlText(text)
        setParseError('')
        isInitialized.current = false // 重置初始化标志
      }
    } catch (error) {
      alert(`解析 YAML 文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }, [onFileLoad])

  // 当表单数据变化时，更新编辑器（保留注释）
  useEffect(() => {
    if (!isUpdatingFromEditor.current && data !== null && data !== undefined) {
      // 检查是否有活动的 input 元素（用户正在编辑）
      const activeElement = document.activeElement
      const isEditingInput = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA'
      )
      
      // 如果用户正在编辑，延迟更新编辑器
      if (isEditingInput) {
        const timeoutId = setTimeout(() => {
          isUpdatingFromForm.current = true
          // 使用 preserveComments=true 以保留注释
          const newYamlText = dataToYaml(data, true)
          setYamlText(newYamlText)
          setTimeout(() => {
            isUpdatingFromForm.current = false
          }, 100)
        }, 300)
        return () => clearTimeout(timeoutId)
      } else {
        isUpdatingFromForm.current = true
        // 使用 preserveComments=true 以保留注释
        const newYamlText = dataToYaml(data, true)
        setYamlText(newYamlText)
        setTimeout(() => {
          isUpdatingFromForm.current = false
        }, 100)
      }
    }
  }, [data, dataToYaml])

  // 编辑器文本变化时，更新表单
  const handleEditorChange = useCallback((text: string) => {
    if (isUpdatingFromForm.current) return

    isUpdatingFromEditor.current = true
    setYamlText(text)

    try {
      // 如果文本为空或只有空白字符，设置为空对象
      if (!text || text.trim() === '') {
        yamlDocRef.current = null
        onDataChange({})
        setParseError('')
      } else {
        // 使用 parseDocument 以保留注释
        const doc = YAML.parseDocument(text)
        const parsed = doc.toJS()
        if (parsed !== undefined) {
          yamlDocRef.current = doc // 保存文档以保留注释
          onDataChange(parsed)
          setParseError('')
        }
      }
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'YAML 解析错误')
    }

    setTimeout(() => {
      isUpdatingFromEditor.current = false
    }, 100)
  }, [onDataChange])

  const handleSort = useCallback(() => {
    const sortedData = sortObjectKeys(data)
    onDataChange(sortedData)
  }, [data, onDataChange])

  const handleSave = useCallback(() => {
    try {
      // 优先使用当前编辑器中的文本（保留注释），否则序列化数据
      const yamlString = yamlText || dataToYaml(data, true)
      const blob = new Blob([yamlString], { type: 'text/yaml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      // 使用编辑后的文件名，确保有扩展名
      let saveFileName = editingFileName.trim()
      if (!saveFileName || saveFileName === '未命名文件') {
        saveFileName = '未命名文件.yaml'
      } else if (!saveFileName.match(/\.(yaml|yml)$/i)) {
        saveFileName = saveFileName + '.yaml'
      }
      a.download = saveFileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      alert(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }, [data, editingFileName, yamlText, dataToYaml])

  // 导出为 JSON
  const handleExportJSON = useCallback(() => {
    try {
      const jsonString = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      let exportFileName = editingFileName.trim()
      if (!exportFileName || exportFileName === '未命名文件') {
        exportFileName = '未命名文件.json'
      } else {
        exportFileName = exportFileName.replace(/\.(yaml|yml)$/i, '.json')
      }
      a.download = exportFileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setShowExportMenu(false)
    } catch (error) {
      alert(`导出 JSON 失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }, [data, editingFileName])

  // 导出为 TOML
  const handleExportTOML = useCallback(() => {
    try {
      const tomlString = TOML.stringify(data)
      const blob = new Blob([tomlString], { type: 'text/toml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      let exportFileName = editingFileName.trim()
      if (!exportFileName || exportFileName === '未命名文件') {
        exportFileName = '未命名文件.toml'
      } else {
        exportFileName = exportFileName.replace(/\.(yaml|yml)$/i, '.toml')
      }
      a.download = exportFileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setShowExportMenu(false)
    } catch (error) {
      alert(`导出 TOML 失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }, [data, editingFileName])

  // 导出为 XML
  const handleExportXML = useCallback(() => {
    try {
      const xmlString = js2xml({ root: data }, { compact: false, spaces: 2 })
      const blob = new Blob([xmlString], { type: 'application/xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      let exportFileName = editingFileName.trim()
      if (!exportFileName || exportFileName === '未命名文件') {
        exportFileName = '未命名文件.xml'
      } else {
        exportFileName = exportFileName.replace(/\.(yaml|yml)$/i, '.xml')
      }
      a.download = exportFileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setShowExportMenu(false)
    } catch (error) {
      alert(`导出 XML 失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }, [data, editingFileName])

  // 点击外部关闭导出菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false)
      }
    }

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showExportMenu])

  const sortObjectKeys = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map(item => sortObjectKeys(item))
    }

    const sortedKeys = Object.keys(obj).sort()
    const sortedObj: any = {}
    for (const key of sortedKeys) {
      sortedObj[key] = sortObjectKeys(obj[key])
    }
    return sortedObj
  }

  return (
    <div className="yaml-visualizer-wrapper">
      <div className="yaml-visualizer">
        <div className="toolbar">
          <div className="toolbar-left">
            <FileIcon className="file-icon" size={16} />
            {isEditingFileName ? (
              <input
                ref={fileNameInputRef}
                type="text"
                className="file-name-input"
                value={editingFileName}
                onChange={handleFileNameChange}
                onBlur={handleFileNameBlur}
                onKeyDown={handleFileNameKeyDown}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span 
                className="file-name" 
                onClick={handleFileNameClick}
                title="点击编辑文件名"
              >
                {editingFileName || '未命名文件'}
              </span>
            )}
            {parseError && (
              <span className="parse-error" title={parseError}>
                ⚠️ 解析错误
              </span>
            )}
          </div>
          <div className="toolbar-right">
            {/* GitHub Star 链接 */}
            <a
              href="https://github.com/deantook/yameilo"
              target="_blank"
              rel="noopener noreferrer"
              className="github-star-link"
              title="给个 Star ⭐"
            >
              <GitHubIcon size={16} />
              <span className="github-star-text">给个 star</span>
            </a>
            
            {/* 搜索框 - 最常用的功能，放在最前面 */}
            <div className="search-container">
              <SearchIcon size={14} className="search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                className="search-input"
                placeholder="搜索配置项 (Ctrl+F)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && matchCount > 0 && (
                <span className="search-count">{matchCount}</span>
              )}
              {searchQuery && (
                <button
                  className="search-clear-btn"
                  onClick={() => {
                    setSearchQuery('')
                    setMatchCount(0)
                  }}
                  title="清除搜索"
                >
                  <CloseIcon size={12} />
                </button>
              )}
            </div>
            
            {/* 文件操作组 */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".yaml,.yml"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <button
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              title="上传 YAML 文件"
            >
              <UploadIcon size={14} />
              <span>上传文件</span>
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              <SaveIcon size={14} />
              <span>保存</span>
            </button>
            
            {/* 导出菜单 */}
            <div className="export-menu-container" ref={exportMenuRef}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowExportMenu(!showExportMenu)}
                title="导出为其他格式"
              >
                <DownloadIcon size={14} />
                <span>导出</span>
                <ChevronDownIcon size={12} />
              </button>
              {showExportMenu && (
                <div className="export-menu">
                  <button
                    className="export-menu-item"
                    onClick={handleExportJSON}
                    title="导出为 JSON 格式"
                  >
                    <span>JSON</span>
                  </button>
                  <button
                    className="export-menu-item"
                    onClick={handleExportTOML}
                    title="导出为 TOML 格式"
                  >
                    <span>TOML</span>
                  </button>
                  <button
                    className="export-menu-item"
                    onClick={handleExportXML}
                    title="导出为 XML 格式"
                  >
                    <span>XML</span>
                  </button>
                </div>
              )}
            </div>
            
            {/* 编辑操作组 */}
            <button
              className="btn btn-secondary"
              onClick={() => editorRef.current?.format()}
              title="格式化 YAML 代码"
            >
              <FormatIcon size={14} />
              <span>格式化</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleSort}
              title="按 key 字母顺序排序"
            >
              <SortIcon size={14} />
              <span>排序</span>
            </button>
            
            {/* 视图操作组 */}
            <button
              className="btn btn-secondary"
              onClick={() => {
                if (formRef.current) {
                  if (isAllExpanded) {
                    formRef.current.collapseAll()
                  } else {
                    formRef.current.expandAll()
                  }
                  setIsAllExpanded(!isAllExpanded)
                }
              }}
              title={isAllExpanded ? '全部折叠' : '全部展开'}
            >
              {isAllExpanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
              <span>{isAllExpanded ? '全部折叠' : '全部展开'}</span>
            </button>
            
            {/* 设置组 */}
            <button
              className={`btn btn-secondary ${showStatsPanel ? 'active' : ''}`}
              onClick={() => setShowStatsPanel(!showStatsPanel)}
              title={showStatsPanel ? '隐藏统计面板' : '显示统计面板'}
            >
              <StatsIcon size={14} />
              <span>统计</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={toggleTheme}
              title={theme === 'light' ? '切换到暗色主题' : '切换到亮色主题'}
            >
              {theme === 'light' ? <MoonIcon size={14} /> : <SunIcon size={14} />}
              <span>{theme === 'light' ? '暗色' : '亮色'}</span>
            </button>
            
            {/* 其他操作 - 危险操作放在最后 */}
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                isInitialized.current = false
                setYamlText('')
                setEditingFileName('未命名文件.yaml')
                onReset()
              }}
              title="清空当前编辑内容"
            >
              <ReloadIcon size={14} />
              <span>清空</span>
            </button>
          </div>
        </div>
        <div className="visualizer-content">
          <div className="editor-panel">
            <YAMLEditor
              ref={editorRef}
              value={yamlText}
              onChange={handleEditorChange}
              onParseError={setParseError}
              theme={theme}
            />
          </div>
          <div className="form-panel">
            <div className="form-container">
              {showStatsPanel && (
                <StatsPanel
                  data={data}
                  yamlText={yamlText}
                  isOpen={isStatsPanelExpanded}
                  onToggle={() => setIsStatsPanelExpanded(!isStatsPanelExpanded)}
                />
              )}
              <YAMLForm 
                ref={formRef}
                data={data} 
                onChange={onDataChange}
                searchQuery={searchQuery}
                onMatchCountChange={setMatchCount}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

