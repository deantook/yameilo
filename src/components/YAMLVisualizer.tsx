import { useState, useCallback, useEffect, useRef } from 'react'
import * as yaml from 'js-yaml'
import YAMLForm, { YAMLFormHandle } from './YAMLForm'
import YAMLEditor, { YAMLEditorHandle } from './YAMLEditor'
import { FileIcon, SortIcon, SaveIcon, ReloadIcon, UploadIcon, ChevronDownIcon, ChevronRightIcon, FormatIcon, SearchIcon, CloseIcon } from './Icons'
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
  const [yamlText, setYamlText] = useState('')
  const [parseError, setParseError] = useState('')
  const [isAllExpanded, setIsAllExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [matchCount, setMatchCount] = useState(0)
  const isUpdatingFromForm = useRef(false)
  const isUpdatingFromEditor = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<YAMLFormHandle | null>(null)
  const editorRef = useRef<YAMLEditorHandle | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 将数据转换为 YAML 文本
  const dataToYaml = useCallback((data: any): string => {
    try {
      // 如果是空对象，返回空字符串
      if (data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0) {
        return ''
      }
      return yaml.dump(data, {
        indent: 2,
        lineWidth: -1,
        quotingType: '"',
        forceQuotes: false,
      })
    } catch (error) {
      return yamlText || ''
    }
  }, [yamlText])

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
      const parsedData = yaml.load(text)
      if (parsedData !== undefined) {
        onFileLoad(parsedData, file.name)
        setYamlText(text)
        setParseError('')
        isInitialized.current = false // 重置初始化标志
      }
    } catch (error) {
      alert(`解析 YAML 文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }, [onFileLoad])

  // 当表单数据变化时，更新编辑器
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
          const newYamlText = dataToYaml(data)
          setYamlText(newYamlText)
          setTimeout(() => {
            isUpdatingFromForm.current = false
          }, 100)
        }, 300)
        return () => clearTimeout(timeoutId)
      } else {
        isUpdatingFromForm.current = true
        const newYamlText = dataToYaml(data)
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
        onDataChange({})
        setParseError('')
      } else {
        const parsed = yaml.load(text)
        if (parsed !== undefined) {
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
      const yamlString = yaml.dump(data, {
        indent: 2,
        lineWidth: -1,
        quotingType: '"',
        forceQuotes: false,
      })
      const blob = new Blob([yamlString], { type: 'text/yaml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName || 'config.yaml'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      alert(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }, [data, fileName])

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
            <span className="file-name">{fileName || '未命名文件'}</span>
            {parseError && (
              <span className="parse-error" title={parseError}>
                ⚠️ 解析错误
              </span>
            )}
          </div>
          <div className="toolbar-right">
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
            <button
              className="btn btn-secondary"
              onClick={handleSort}
              title="按 key 字母顺序排序"
            >
              <SortIcon size={14} />
              <span>排序</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => editorRef.current?.format()}
              title="格式化 YAML 代码"
            >
              <FormatIcon size={14} />
              <span>格式化</span>
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              <SaveIcon size={14} />
              <span>保存</span>
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                isInitialized.current = false
                setYamlText('')
                onReset()
              }}
            >
              <ReloadIcon size={14} />
              <span>清空</span>
            </button>
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
          </div>
        </div>
        <div className="visualizer-content">
          <div className="editor-panel">
            <YAMLEditor
              ref={editorRef}
              value={yamlText}
              onChange={handleEditorChange}
              onParseError={setParseError}
            />
          </div>
          <div className="form-panel">
            <div className="form-container">
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

