import { useState, useCallback, useEffect, useRef } from 'react'
import * as YAML from 'yaml'
import * as TOML from '@iarna/toml'
import * as xmljs from 'xml-js'
import { useTheme } from '../contexts/ThemeContext'
import YAMLForm, { YAMLFormHandle } from './YAMLForm'
import YAMLEditor, { YAMLEditorHandle } from './YAMLEditor'
import StatsPanel from './StatsPanel'
import TemplateManager from './TemplateManager'
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
  const [commentsMap, setCommentsMap] = useState<Map<string, string>>(new Map()) // 存储路径到注释的映射

  // 提取注释信息：递归遍历 YAML 节点，提取所有路径的注释
  const extractComments = useCallback((node: YAML.Node | null, path: string = '', comments: Map<string, string> = new Map()): Map<string, string> => {
    if (!node) return comments

    // 如果是 Map（对象）
    if (YAML.isMap(node)) {
      const map = node as YAML.YAMLMap
      map.items.forEach(pair => {
        if (YAML.isScalar(pair.key)) {
          const key = (pair.key as YAML.Scalar).value as string
          const keyPath = path ? `${path}.${key}` : key
          
          // 提取注释：检查所有可能的位置（如 "app: # 应用配置"）
          const keyAny = pair.key as any
          const pairAny = pair as any
          let foundComment = null
          let commentSource = ''
          
          // 检查 key 节点的注释
          if (keyAny.comment) {
            foundComment = keyAny.comment
            commentSource = 'key.comment'
          } else if (keyAny.commentAfter) {
            foundComment = keyAny.commentAfter
            commentSource = 'key.commentAfter'
          }
          
          // 如果 key 没有注释，检查 Pair 的注释
          if (!foundComment) {
            if (pairAny.comment) {
              foundComment = pairAny.comment
              commentSource = 'pair.comment'
            } else if (pairAny.commentAfter) {
              foundComment = pairAny.commentAfter
              commentSource = 'pair.commentAfter'
            }
          }
          
          // 调试：打印所有注释属性
          if (keyPath === 'app') {
            console.log(`调试 [${keyPath}]:`, {
              keyComment: keyAny.comment,
              keyCommentAfter: keyAny.commentAfter,
              keyCommentBefore: keyAny.commentBefore,
              pairComment: pairAny.comment,
              pairCommentAfter: pairAny.commentAfter,
              pairCommentBefore: pairAny.commentBefore,
              foundComment,
              commentSource
            })
          }
          
          if (foundComment) {
            // comment 可能是字符串或 Comment 对象
            let commentText = ''
            if (typeof foundComment === 'string') {
              commentText = foundComment
            } else if (foundComment && typeof foundComment === 'object') {
              // 如果是 Comment 对象，尝试获取文本
              commentText = (foundComment as any).text || (foundComment as any).comment || foundComment.toString() || ''
            } else {
              commentText = String(foundComment)
            }
            
            if (commentText.trim()) {
              comments.set(keyPath, commentText.trim())
              console.log(`找到键注释 [${keyPath}] (来源: ${commentSource}):`, commentText.trim())
            }
          }
          
          // 处理值节点
          if (pair.value && YAML.isNode(pair.value)) {
            const valueNode = pair.value as YAML.Node
            const valueAny = valueNode as any
            
            // 对于 Map 节点，检查 commentBefore（如 "app: # 应用配置" 的注释可能在 Map 的 commentBefore 中）
            if (YAML.isMap(valueNode) && !foundComment) {
              if (valueAny.commentBefore) {
                let commentText = ''
                if (typeof valueAny.commentBefore === 'string') {
                  commentText = valueAny.commentBefore
                } else if (valueAny.commentBefore && typeof valueAny.commentBefore === 'object') {
                  commentText = (valueAny.commentBefore as any).text || (valueAny.commentBefore as any).comment || valueAny.commentBefore.toString() || ''
                } else {
                  commentText = String(valueAny.commentBefore)
                }
                
                if (commentText.trim()) {
                  comments.set(keyPath, commentText.trim())
                  console.log(`找到 Map commentBefore 注释 [${keyPath}]:`, commentText.trim())
                  foundComment = valueAny.commentBefore
                }
              }
            }
            
            // 提取值的注释（如 "name: value # 注释"）
            // 如果 key/Pair/Map 没有注释，使用值的注释；否则优先使用 key/Pair/Map 的注释
            if (!foundComment) {
              let valueComment = null
              if (valueAny.comment) {
                valueComment = valueAny.comment
              } else if (valueAny.commentAfter) {
                valueComment = valueAny.commentAfter
              }
              
              if (valueComment) {
                let commentText = ''
                if (typeof valueComment === 'string') {
                  commentText = valueComment
                } else if (valueComment && typeof valueComment === 'object') {
                  commentText = (valueComment as any).text || (valueComment as any).comment || valueComment.toString() || ''
                } else {
                  commentText = String(valueComment)
                }
                
                if (commentText.trim()) {
                  comments.set(keyPath, commentText.trim())
                  console.log(`找到值注释 [${keyPath}]:`, commentText.trim())
                }
              }
            }
            
            // 递归处理值（对于对象和数组），这会提取嵌套的注释
            extractComments(valueNode, keyPath, comments)
          }
        }
      })
    }
    // 如果是 Seq（数组）
    else if (YAML.isSeq(node)) {
      const seq = node as YAML.YAMLSeq
      seq.items.forEach((item, index) => {
        const itemPath = path ? `${path}[${index}]` : `[${index}]`
        
        // 提取数组项的注释
        if (item && YAML.isNode(item)) {
          const itemAny = item as any
          const itemComment = itemAny.comment || itemAny.commentAfter || itemAny.commentBefore
          if (itemComment) {
            const commentText = typeof itemComment === 'string' ? itemComment : itemComment?.toString() || ''
            if (commentText.trim()) {
              comments.set(itemPath, commentText.trim())
              console.log(`找到数组项注释 [${itemPath}]:`, commentText.trim())
            }
          }
          
          extractComments(item as YAML.Node, itemPath, comments)
        }
      })
    }
    // 如果是 Scalar（标量值），提取其注释
    else if (YAML.isScalar(node)) {
      const nodeAny = node as any
      const scalarComment = nodeAny.comment || nodeAny.commentAfter || nodeAny.commentBefore
      if (scalarComment && path) {
        const commentText = typeof scalarComment === 'string' ? scalarComment : scalarComment?.toString() || ''
        if (commentText.trim()) {
          comments.set(path, commentText.trim())
          console.log(`找到标量注释 [${path}]:`, commentText.trim())
        }
      }
    }

    return comments
  }, [])

  // 当 YAML 文档变化时，更新注释映射
  useEffect(() => {
    // 尝试从 yamlText 重新解析文档以获取最新的注释
    if (yamlText) {
      try {
        const doc = YAML.parseDocument(yamlText)
        if (doc.contents) {
          const comments = extractComments(doc.contents)
          console.log('提取的注释:', Array.from(comments.entries()))
          setCommentsMap(comments)
          // 同时更新 yamlDocRef
          yamlDocRef.current = doc
        } else {
          setCommentsMap(new Map())
        }
      } catch (error) {
        // 解析失败时，尝试使用 yamlDocRef
        if (yamlDocRef.current?.contents) {
          const comments = extractComments(yamlDocRef.current.contents)
          console.log('从 yamlDocRef 提取的注释:', Array.from(comments.entries()))
          setCommentsMap(comments)
        } else {
          setCommentsMap(new Map())
        }
      }
    } else if (yamlDocRef.current?.contents) {
      const comments = extractComments(yamlDocRef.current.contents)
      console.log('从 yamlDocRef 提取的注释:', Array.from(comments.entries()))
      setCommentsMap(comments)
    } else {
      setCommentsMap(new Map())
    }
  }, [yamlText, extractComments])

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
        // 提取注释
        if (doc.contents) {
          const comments = extractComments(doc.contents)
          setCommentsMap(comments)
        } else {
          setCommentsMap(new Map())
        }
      }
    } catch (error) {
      alert(`解析 YAML 文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }, [onFileLoad, extractComments])

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
        setCommentsMap(new Map())
      } else {
        // 使用 parseDocument 以保留注释
        const doc = YAML.parseDocument(text)
        const parsed = doc.toJS()
        if (parsed !== undefined) {
          yamlDocRef.current = doc // 保存文档以保留注释
          onDataChange(parsed)
          setParseError('')
          // 提取注释
          if (doc.contents) {
            const comments = extractComments(doc.contents)
            setCommentsMap(comments)
          } else {
            setCommentsMap(new Map())
          }
        }
      }
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'YAML 解析错误')
    }

    setTimeout(() => {
      isUpdatingFromEditor.current = false
    }, 100)
  }, [onDataChange, extractComments])

  const handleSort = useCallback(() => {
    const sortedData = sortObjectKeys(data)
    onDataChange(sortedData)
  }, [data, onDataChange])

  // 应用模板
  const handleApplyTemplate = useCallback((templateData: any) => {
    onDataChange(templateData)
    // 更新 YAML 文本
    const newYamlText = dataToYaml(templateData)
    setYamlText(newYamlText)
    setParseError('')
    isInitialized.current = false
  }, [onDataChange, dataToYaml])

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
      // 确保 data 不为空
      if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        alert('无法导出空数据为 XML')
        return
      }
      
      // 使用 xml-js 的 js2xml 函数
      // 注意：compact: false 在某些情况下可能返回空字符串，使用 compact: true 确保正常工作
      // 如果需要格式化，可以在生成后手动格式化
      let xmlString = xmljs.js2xml({ root: data }, { compact: true })
      
      // 如果 compact: true 返回空，尝试使用 compact: false
      if (!xmlString || xmlString.trim().length === 0) {
        xmlString = xmljs.js2xml({ root: data }, { compact: false, spaces: 2 })
      }
      
      // 确保生成的 XML 字符串不为空
      if (!xmlString || xmlString.trim().length === 0) {
        alert('生成的 XML 内容为空，请检查数据是否正确')
        return
      }
      
      // 格式化 XML（如果使用 compact: true）
      if (xmlString.includes('><') && !xmlString.includes('\n')) {
        // 格式化函数：正确添加缩进
        const formatXML = (xml: string): string => {
          // 在标签之间添加换行，同时处理文本内容
          let formatted = xml
            .replace(/></g, '>\n<')
            .replace(/>([^<\n]+)</g, '>\n$1\n<') // 在文本内容和标签之间添加换行
          
          const lines = formatted.split('\n')
          let indentLevel = 0
          const indentSize = 2
          const result: string[] = []
          
          // 辅助函数：查找下一个非空行的类型
          const getNextNonEmptyLineType = (startIndex: number): 'end' | 'start' | 'text' | 'self-closing' | null => {
            for (let j = startIndex + 1; j < lines.length; j++) {
              const trimmed = lines[j].trim()
              if (!trimmed) continue
              if (trimmed.startsWith('</')) return 'end'
              if (trimmed.startsWith('<') && trimmed.endsWith('/>')) return 'self-closing'
              if (trimmed.startsWith('<')) return 'start'
              return 'text'
            }
            return null
          }
          
          for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim()
            if (!trimmed) continue
            
            // 处理结束标签：先减少缩进，然后添加（结束标签应该和对应的开始标签同级）
            if (trimmed.startsWith('</')) {
              indentLevel = Math.max(0, indentLevel - 1)
              result.push(' '.repeat(indentLevel * indentSize) + trimmed)
            }
            // 处理自闭合标签：使用当前缩进，不改变缩进级别
            else if (trimmed.endsWith('/>')) {
              result.push(' '.repeat(indentLevel * indentSize) + trimmed)
            }
            // 处理开始标签
            else if (trimmed.startsWith('<') && !trimmed.startsWith('</')) {
              result.push(' '.repeat(indentLevel * indentSize) + trimmed)
              const nextType = getNextNonEmptyLineType(i)
              // 如果不是自闭合标签，且有内容（下一个不是结束标签），则增加缩进级别
              // 这样文本内容和嵌套的子元素都会有正确的缩进
              if (!trimmed.endsWith('/>') && nextType !== null && nextType !== 'end') {
                indentLevel++
              }
            }
            // 文本内容：使用当前缩进级别（在标签内部，比开始标签多一级）
            else {
              result.push(' '.repeat(indentLevel * indentSize) + trimmed)
            }
          }
          
          return result.join('\n')
        }
        
        xmlString = formatXML(xmlString)
      }
      
      // 添加 XML 声明（如果还没有）
      if (!xmlString.startsWith('<?xml')) {
        xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlString
      }
      
      const blob = new Blob([xmlString], { type: 'application/xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      let exportFileName = editingFileName.trim()
      if (!exportFileName || exportFileName === '未命名文件') {
        exportFileName = '未命名文件.xml'
      } else {
        exportFileName = exportFileName.replace(/\.(yaml|yml|json|toml)$/i, '.xml')
        if (!exportFileName.endsWith('.xml')) {
          exportFileName += '.xml'
        }
      }
      a.download = exportFileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setShowExportMenu(false)
    } catch (error) {
      alert(`导出 XML 失败: ${error instanceof Error ? error.message : '未知错误'}`)
      console.error('导出 XML 错误:', error)
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
            <TemplateManager
              currentData={data}
              onApplyTemplate={handleApplyTemplate}
            />
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
                commentsMap={commentsMap}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

