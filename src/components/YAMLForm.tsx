import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { ChevronDownIcon, ChevronRightIcon, DeleteIcon, PlusIcon, DragHandleIcon, CopyIcon, LocateIcon } from './Icons'
import './YAMLForm.css'

interface YAMLFormProps {
  data: any
  onChange: (data: any) => void
  path?: string
  expanded?: Set<string>
  onExpandedChange?: (expanded: Set<string>) => void
  searchQuery?: string
  onMatchCountChange?: (count: number) => void
  commentsMap?: Map<string, string>
  highlightedPath?: string | null
  onLocatePath?: (path: string) => void
}

export interface YAMLFormHandle {
  expandAll: () => void
  collapseAll: () => void
}

const YAMLForm = forwardRef<YAMLFormHandle, YAMLFormProps>(({ data, onChange, path = '', expanded: expandedProp, onExpandedChange, searchQuery = '', onMatchCountChange, commentsMap = new Map(), highlightedPath, onLocatePath }, ref) => {
  // 如果提供了 expanded prop，使用它；否则使用本地状态（用于嵌套组件）
  const [localExpanded, setLocalExpanded] = useState<Set<string>>(new Set())
  const expanded = expandedProp !== undefined ? expandedProp : localExpanded
  
  // 使用 ref 存储 onExpandedChange，避免依赖问题
  const onExpandedChangeRef = useRef(onExpandedChange)
  useEffect(() => {
    onExpandedChangeRef.current = onExpandedChange
  }, [onExpandedChange])
  
  // 统一的 setExpanded 函数，处理两种情况
  const setExpanded = useCallback((value: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    if (onExpandedChangeRef.current) {
      // 如果提供了 onExpandedChange，需要先获取当前值
      // 使用函数式更新来避免依赖 expanded
      if (typeof value === 'function') {
        // 从 expandedProp 获取当前值（如果可用），否则使用空 Set
        const currentValue = expandedProp !== undefined ? expandedProp : new Set<string>()
        const newValue = value(currentValue)
        onExpandedChangeRef.current(newValue)
      } else {
        onExpandedChangeRef.current(value)
      }
    } else {
      // 否则使用本地状态更新
      setLocalExpanded(value)
    }
  }, [expandedProp])
  const [showAddMenuArray, setShowAddMenuArray] = useState(false)
  const [showAddMenuObject, setShowAddMenuObject] = useState(false)
  const [showTypeMenu, setShowTypeMenu] = useState<Set<string>>(new Set())
  const addMenuArrayRef = useRef<HTMLDivElement>(null)
  const addMenuObjectRef = useRef<HTMLDivElement>(null)
  const typeMenuRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const keyInputRefs = useRef<Map<string, HTMLInputElement>>(new Map())
  const pathElementRefs = useRef<Map<string, HTMLElement>>(new Map())
  const currentHighlightedElementRef = useRef<HTMLElement | null>(null) // 跟踪当前高亮的元素
  const fadeOutTimeoutRef = useRef<number | null>(null) // 跟踪淡出定时器
  const [draggedIndex, setDraggedIndex] = useState<number | string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | string | null>(null)

  // 点击外部关闭数组菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addMenuArrayRef.current && !addMenuArrayRef.current.contains(event.target as Node)) {
        setShowAddMenuArray(false)
      }
    }

    if (showAddMenuArray) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAddMenuArray])

  // 点击外部关闭对象菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addMenuObjectRef.current && !addMenuObjectRef.current.contains(event.target as Node)) {
        setShowAddMenuObject(false)
      }
    }

    if (showAddMenuObject) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAddMenuObject])

  // 检查值是否匹配搜索查询
  const matchesSearch = useCallback((key: string, value: any, currentPath: string): boolean => {
    if (!searchQuery) return true
    
    const query = searchQuery.toLowerCase()
    const keyMatch = key.toLowerCase().includes(query)
    
    // 检查值是否匹配
    let valueMatch = false
    if (value === null || value === undefined) {
      valueMatch = false
    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      valueMatch = String(value).toLowerCase().includes(query)
    } else if (Array.isArray(value)) {
      // 检查数组中是否有匹配项
      valueMatch = value.some(item => {
        if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
          return String(item).toLowerCase().includes(query)
        }
        return false
      })
    } else if (typeof value === 'object') {
      // 递归检查对象中是否有匹配项
      valueMatch = Object.entries(value).some(([k, v]) => 
        matchesSearch(k, v, currentPath ? `${currentPath}.${k}` : k)
      )
    }
    
    return keyMatch || valueMatch
  }, [searchQuery])

  // 递归检查是否有子项匹配搜索
  const hasMatchingChild = useCallback((value: any, currentPath: string): boolean => {
    if (!searchQuery) return true
    
    if (Array.isArray(value)) {
      return value.some((item, index) => {
        const itemPath = currentPath ? `${currentPath}[${index}]` : `[${index}]`
        if (typeof item === 'object' && item !== null) {
          return hasMatchingChild(item, itemPath)
        }
        return matchesSearch(String(index), item, itemPath)
      })
    } else if (typeof value === 'object' && value !== null) {
      return Object.entries(value).some(([k, v]) => {
        const itemPath = currentPath ? `${currentPath}.${k}` : k
        if (typeof v === 'object' && v !== null) {
          return matchesSearch(k, v, itemPath) || hasMatchingChild(v, itemPath)
        }
        return matchesSearch(k, v, itemPath)
      })
    }
    
    return false
  }, [searchQuery, matchesSearch])

  // 高亮文本函数
  const highlightText = useCallback((text: string, query: string): React.ReactNode => {
    if (!query) return text
    
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="search-highlight">{part}</mark>
      ) : (
        part
      )
    )
  }, [])

  // 计算匹配项数量（只在顶层执行）
  const countMatches = useCallback((obj: any, currentPath: string = ''): number => {
    if (!searchQuery) return 0
    
    let count = 0
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const itemPath = currentPath ? `${currentPath}[${index}]` : `[${index}]`
        if (matchesSearch(String(index), item, itemPath)) {
          count++
        }
        if (typeof item === 'object' && item !== null) {
          count += countMatches(item, itemPath)
        }
      })
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        const itemPath = currentPath ? `${currentPath}.${key}` : key
        if (matchesSearch(key, value, itemPath)) {
          count++
        }
        if (typeof value === 'object' && value !== null) {
          count += countMatches(value, itemPath)
        }
      })
    }
    return count
  }, [searchQuery, matchesSearch])

  // 自动展开匹配项的父级节点
  useEffect(() => {
    if (!searchQuery || path) return // 只在顶层执行
    
    const expandMatchingPaths = (obj: any, currentPath: string = '', pathsToExpand: Set<string> = new Set()): Set<string> => {
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          const itemPath = currentPath ? `${currentPath}[${index}]` : `[${index}]`
          if (matchesSearch(String(index), item, itemPath) || hasMatchingChild(item, itemPath)) {
            // 展开所有父级路径
            const pathParts = itemPath.split(/[\[\]\.]/).filter(Boolean)
            let parentPath = ''
            pathParts.forEach((part, i) => {
              if (i === 0) {
                parentPath = part
              } else {
                parentPath = parentPath.includes('[') ? `${parentPath}[${part}]` : `${parentPath}.${part}`
              }
              if (parentPath) {
                pathsToExpand.add(parentPath)
              }
            })
          }
          if (typeof item === 'object' && item !== null) {
            expandMatchingPaths(item, itemPath, pathsToExpand)
          }
        })
      } else if (typeof obj === 'object' && obj !== null) {
        Object.entries(obj).forEach(([key, value]) => {
          const itemPath = currentPath ? `${currentPath}.${key}` : key
          if (matchesSearch(key, value, itemPath) || hasMatchingChild(value, itemPath)) {
            // 展开所有父级路径
            const pathParts = itemPath.split(/[\[\]\.]/).filter(Boolean)
            let parentPath = ''
            pathParts.forEach((part, i) => {
              if (i === 0) {
                parentPath = part
              } else {
                parentPath = parentPath.includes('[') ? `${parentPath}[${part}]` : `${parentPath}.${part}`
              }
              if (parentPath) {
                pathsToExpand.add(parentPath)
              }
            })
          }
          if (typeof value === 'object' && value !== null) {
            expandMatchingPaths(value, itemPath, pathsToExpand)
          }
        })
      }
      return pathsToExpand
    }
    
    const pathsToExpand = expandMatchingPaths(data)
    if (pathsToExpand.size > 0) {
      setExpanded((prev) => {
        const next = new Set(prev)
        pathsToExpand.forEach(path => next.add(path))
        return next
      })
    }
  }, [searchQuery, data, path, matchesSearch, hasMatchingChild, setExpanded])

  // 计算匹配项数量并通知父组件（只在顶层执行）
  useEffect(() => {
    if (!path && onMatchCountChange) {
      const count = countMatches(data)
      onMatchCountChange(count)
    }
  }, [searchQuery, data, path, countMatches, onMatchCountChange])

  // 清除高亮的辅助函数
  const clearHighlight = useCallback(() => {
    // 清除之前的定时器
    if (fadeOutTimeoutRef.current !== null) {
      clearTimeout(fadeOutTimeoutRef.current)
      fadeOutTimeoutRef.current = null
    }
    
    const fadeOutElements: HTMLElement[] = []
    
    // 从 ref 中查找
    if (currentHighlightedElementRef.current) {
      fadeOutElements.push(currentHighlightedElementRef.current)
    }
    
    // 从 pathElementRefs 中查找
    pathElementRefs.current.forEach((el) => {
      if (el.classList.contains('path-highlighted') && !fadeOutElements.includes(el)) {
        fadeOutElements.push(el)
      }
    })
    
    // 通过 data-path 属性查找
    document.querySelectorAll('[data-path].path-highlighted').forEach((el) => {
      if (!fadeOutElements.includes(el as HTMLElement)) {
        fadeOutElements.push(el as HTMLElement)
      }
    })
    
    if (fadeOutElements.length === 0) return
    
    // 添加淡出类（确保淡出动画总是执行）
    fadeOutElements.forEach((el) => {
      // 先移除高亮类，添加淡出类
      el.classList.remove('path-highlighted')
      el.classList.add('path-highlighted-fadeout')
    })
    
    // 等待动画完成后移除（总是等待动画完成，确保动画可见）
    fadeOutTimeoutRef.current = window.setTimeout(() => {
      fadeOutElements.forEach((el) => {
        el.classList.remove('path-highlighted', 'path-highlighted-fadeout')
        el.style.removeProperty('background-color')
        el.style.removeProperty('border')
      })
      currentHighlightedElementRef.current = null
      fadeOutTimeoutRef.current = null
    }, 400) // 固定等待 400ms，确保淡出动画完成
  }, [])

  // 处理路径高亮和滚动定位（只在顶层执行）
  useEffect(() => {
    // 当 highlightedPath 为 null 时，清除所有高亮（使用淡出动画）
    if (!highlightedPath) {
      if (!path) {
        clearHighlight()
      }
      return
    }
    
    if (path) return // 只在顶层执行

    // 先清除之前的高亮（使用淡出动画）
    clearHighlight()

    // 先展开父级路径，然后查找元素
    const pathParts = highlightedPath.split(/[\.\[\]]/).filter(Boolean)
    let currentPath = ''
    const pathsToExpand = new Set<string>()
    
    // 构建需要展开的路径
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i]
      if (i === 0) {
        currentPath = part
      } else {
        // 检查是否是数组索引（纯数字）
        const numPart = parseInt(part)
        if (!isNaN(numPart) && part === String(numPart)) {
          // 这是数组索引
          currentPath = `${currentPath}[${part}]`
        } else {
          currentPath = `${currentPath}.${part}`
        }
      }
      if (currentPath) {
        pathsToExpand.add(currentPath)
      }
    }
    
    // 展开所有父级路径
    if (pathsToExpand.size > 0) {
      setExpanded((prev) => {
        // 检查是否所有路径都已经展开，避免不必要的更新
        let needsUpdate = false
        for (const p of pathsToExpand) {
          if (!prev.has(p)) {
            needsUpdate = true
            break
          }
        }
        if (!needsUpdate) {
          return prev // 返回相同的引用，避免触发更新
        }
        const next = new Set(prev)
        pathsToExpand.forEach(p => next.add(p))
        return next
      })
    }
    
    // 查找元素的函数
    const findElement = (targetPath: string): HTMLElement | undefined => {
      // 1. 直接精确匹配
      let element = pathElementRefs.current.get(targetPath)
      if (element) return element
      
      // 2. 尝试所有存储的路径，找到完全匹配的
      for (const [storedPath, el] of pathElementRefs.current.entries()) {
        if (storedPath === targetPath) {
          return el
        }
      }
      
      // 3. 尝试通过 data-path 属性查找（更可靠的方法）
      const elements = document.querySelectorAll(`[data-path="${targetPath}"]`)
      if (elements.length > 0) {
        return elements[0] as HTMLElement
      }
      
      // 4. 尝试部分匹配（处理可能的路径格式差异）
      // 例如：targetPath = "services.web.volumes[0]", storedPath = "volumes[0]"
      const targetParts = targetPath.split(/[\.\[\]]/).filter(Boolean)
      for (const [storedPath, el] of pathElementRefs.current.entries()) {
        const storedParts = storedPath.split(/[\.\[\]]/).filter(Boolean)
        // 检查是否是目标路径的后缀
        if (storedParts.length > 0 && targetParts.length >= storedParts.length) {
          const targetSuffix = targetParts.slice(-storedParts.length)
          if (targetSuffix.join('.') === storedParts.join('.')) {
            // 需要重新构建完整路径来匹配
            const fullStoredPath = targetPath.substring(0, targetPath.lastIndexOf(storedPath)) + storedPath
            if (fullStoredPath === targetPath || storedPath === targetPath) {
              return el
            }
          }
        }
      }
      
      return undefined
    }
    
    // 应用高亮和滚动的函数
    const applyHighlight = (el: HTMLElement) => {
      // 更新当前高亮元素的引用
      currentHighlightedElementRef.current = el
      
      // 移除淡出类（如果有）
      el.classList.remove('path-highlighted-fadeout')
      
      // 强制添加高亮类（通过直接 DOM 操作）
      el.classList.add('path-highlighted')
      
      // 滚动到视图
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        
        // 再次确保高亮类存在（防止被 React 重新渲染覆盖）
        setTimeout(() => {
          el.classList.remove('path-highlighted-fadeout')
          el.classList.add('path-highlighted')
          currentHighlightedElementRef.current = el
        }, 100)
      }, 50)
    }
    
    // 延迟一下，等待 DOM 更新（增加延迟时间，确保展开完成）
    setTimeout(() => {
      let element = findElement(highlightedPath)
      
      if (element) {
        applyHighlight(element)
      } else {
        // 如果还是找不到，再等待一下（可能 DOM 还没完全更新）
        setTimeout(() => {
          element = findElement(highlightedPath)
          if (element) {
            applyHighlight(element)
          } else {
            // 最后一次重试，等待更长时间
            setTimeout(() => {
              element = findElement(highlightedPath)
              if (element) {
                applyHighlight(element)
              }
            }, 500)
          }
        }, 300)
      }
    }, 300)
    
    // 清理函数：当组件卸载或 highlightedPath 变化时清除高亮
    return () => {
      if (fadeOutTimeoutRef.current !== null) {
        clearTimeout(fadeOutTimeoutRef.current)
        fadeOutTimeoutRef.current = null
      }
      // 如果 highlightedPath 变为 null，确保清除高亮
      if (!highlightedPath && !path) {
        clearHighlight()
      }
    }
  }, [highlightedPath, path, setExpanded, clearHighlight])

  // 获取值的类型
  const getValueType = useCallback((value: any): 'string' | 'number' | 'boolean' | 'object' | 'array' => {
    if (value === null || value === undefined) return 'string'
    if (Array.isArray(value)) return 'array'
    if (typeof value === 'object') return 'object'
    if (typeof value === 'number') return 'number'
    if (typeof value === 'boolean') return 'boolean'
    return 'string'
  }, [])

  // 转换值的类型
  const convertValueType = useCallback((value: any, targetType: 'string' | 'number' | 'boolean' | 'object' | 'array'): any => {
    const currentType = getValueType(value)
    
    if (currentType === targetType) {
      return value
    }

    switch (targetType) {
      case 'string':
        if (currentType === 'object' || currentType === 'array') {
          return JSON.stringify(value)
        }
        return String(value)
      
      case 'number':
        if (currentType === 'boolean') {
          return value ? 1 : 0
        }
        if (currentType === 'string') {
          const num = parseFloat(value)
          return isNaN(num) ? 0 : num
        }
        if (currentType === 'object' || currentType === 'array') {
          return 0
        }
        return Number(value) || 0
      
      case 'boolean':
        if (currentType === 'string') {
          const lower = String(value).toLowerCase()
          return lower === 'true' || lower === '1' || lower === 'yes'
        }
        if (currentType === 'number') {
          return value !== 0
        }
        if (currentType === 'object' || currentType === 'array') {
          return Object.keys(value).length > 0
        }
        return Boolean(value)
      
      case 'object':
        if (currentType === 'string') {
          try {
            const parsed = JSON.parse(value)
            if (typeof parsed === 'object' && !Array.isArray(parsed)) {
              return parsed
            }
          } catch {
            // 如果解析失败，返回空对象
          }
          return {}
        }
        if (currentType === 'array' || currentType === 'number' || currentType === 'boolean') {
          return {}
        }
        return {}
      
      case 'array':
        if (currentType === 'string') {
          try {
            const parsed = JSON.parse(value)
            if (Array.isArray(parsed)) {
              return parsed
            }
          } catch {
            // 如果解析失败，返回包含该字符串的数组
          }
          return [value]
        }
        if (currentType === 'object') {
          return Object.values(value)
        }
        if (currentType === 'number' || currentType === 'boolean') {
          return [value]
        }
        return []
      
      default:
        return value
    }
  }, [getValueType])

  const toggleExpand = useCallback((key: string) => {
    // 构建完整的路径key
    const fullKey = path ? `${path}.${key}` : key
    setExpanded((prev: Set<string>) => {
      const next = new Set(prev)
      if (next.has(fullKey)) {
        next.delete(fullKey)
      } else {
        next.add(fullKey)
      }
      return next
    })
  }, [path, setExpanded])

  // 递归收集所有可展开的 key（使用完整路径，从根路径开始）
  const collectExpandableKeys = useCallback((obj: any, prefix: string = '', keys: Set<string> = new Set()): Set<string> => {
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const key = prefix ? `${prefix}[${index}]` : String(index)
        const isObject = typeof item === 'object' && item !== null && !Array.isArray(item)
        const isNestedArray = Array.isArray(item)
        if (isObject || isNestedArray) {
          keys.add(key)
          collectExpandableKeys(item, key, keys)
        }
      })
    } else if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach(key => {
        const value = obj[key]
        const fullKey = prefix ? `${prefix}.${key}` : key
        const isObject = typeof value === 'object' && value !== null && !Array.isArray(value)
        const isNestedArray = Array.isArray(value)
        if (isObject || isNestedArray) {
          keys.add(fullKey)
          collectExpandableKeys(value, fullKey, keys)
        }
      })
    }
    return keys
  }, [])

  // 全部展开（只在顶层调用）
  const expandAll = useCallback(() => {
    if (path) return // 只在顶层执行
    const allKeys = collectExpandableKeys(data, '')
    setExpanded(allKeys)
  }, [data, path, collectExpandableKeys, setExpanded])

  // 全部折叠（只在顶层调用）
  const collapseAll = useCallback(() => {
    if (path) return // 只在顶层执行
    setExpanded(new Set())
  }, [path, setExpanded])

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    expandAll,
    collapseAll,
  }), [expandAll, collapseAll])

  const updateValue = useCallback(
    (key: string, value: any) => {
      const newData = Array.isArray(data) ? [...data] : { ...data }
      if (Array.isArray(newData)) {
        newData[parseInt(key)] = value
      } else {
        newData[key] = value
      }
      onChange(newData)
    },
    [data, onChange]
  )

  const changeValueType = useCallback(
    (key: string, newType: 'string' | 'number' | 'boolean' | 'object' | 'array') => {
      const currentValue = Array.isArray(data) ? data[parseInt(key)] : data[key]
      const convertedValue = convertValueType(currentValue, newType)
      updateValue(key, convertedValue)
      setShowTypeMenu(prev => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    },
    [data, updateValue, convertValueType]
  )

  const toggleTypeMenu = useCallback((key: string) => {
    setShowTypeMenu(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  // 类型选择器组件
  const TypeSelector = useCallback(({ itemKey, currentValue }: { itemKey: string, currentValue: any }) => {
    const currentType = getValueType(currentValue)
    const isOpen = showTypeMenu.has(itemKey)

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const menuRef = typeMenuRefs.current.get(itemKey)
        if (menuRef && !menuRef.contains(event.target as Node)) {
          setShowTypeMenu(prev => {
            const next = new Set(prev)
            next.delete(itemKey)
            return next
          })
        }
      }

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside)
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [itemKey, isOpen])

    const typeLabels: Record<'string' | 'number' | 'boolean' | 'object' | 'array', string> = {
      string: '字符串',
      number: '数字',
      boolean: '布尔值',
      object: '对象',
      array: '数组'
    }

    return (
      <div 
        className="type-selector-container"
        ref={(el) => {
          if (el) {
            typeMenuRefs.current.set(itemKey, el)
          } else {
            typeMenuRefs.current.delete(itemKey)
          }
        }}
      >
        <button
          className="type-selector-btn"
          onClick={() => toggleTypeMenu(itemKey)}
          title="更改类型"
        >
          <span className="type-label">{typeLabels[currentType]}</span>
          <ChevronDownIcon size={10} />
        </button>
        {isOpen && (
          <div className="type-menu">
            {(['string', 'number', 'boolean', 'object', 'array'] as const).map(type => (
              <button
                key={type}
                onClick={() => changeValueType(itemKey, type)}
                className={`type-menu-item ${currentType === type ? 'active' : ''}`}
              >
                {typeLabels[type]}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }, [getValueType, showTypeMenu, toggleTypeMenu, changeValueType])

  const addItem = useCallback(
    (type: 'string' | 'number' | 'boolean' | 'object' | 'array', key?: string) => {
      const newData = Array.isArray(data) ? [...data] : { ...data }
      let defaultValue: any
      
      switch (type) {
        case 'string':
          defaultValue = ''
          break
        case 'number':
          defaultValue = 0
          break
        case 'boolean':
          defaultValue = false
          break
        case 'object':
          defaultValue = {}
          break
        case 'array':
          defaultValue = []
          break
        default:
          defaultValue = ''
      }
      
      if (Array.isArray(newData)) {
        newData.push(defaultValue)
      } else {
        // 生成唯一的 key
        let newKey = key || 'newKey'
        let counter = 1
        while (newData[newKey] !== undefined) {
          newKey = `newKey${counter}`
          counter++
        }
        newData[newKey] = defaultValue
      }
      onChange(newData)
      setShowAddMenuArray(false)
      setShowAddMenuObject(false)
    },
    [data, onChange]
  )

  const deleteItem = useCallback(
    (key: string) => {
      const newData = Array.isArray(data) ? [...data] : { ...data }
      if (Array.isArray(newData)) {
        newData.splice(parseInt(key), 1)
      } else {
        delete newData[key]
      }
      onChange(newData)
    },
    [data, onChange]
  )

  // 拖拽排序 - 数组
  const handleArrayDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.stopPropagation()
    setDraggedIndex(index)
  }, [])

  const handleArrayDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }, [draggedIndex])

  const handleArrayDragEnd = useCallback(() => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [])

  const handleArrayDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const newData = [...data]
    const draggedItem = newData[draggedIndex as number]
    newData.splice(draggedIndex as number, 1)
    newData.splice(dropIndex, 0, draggedItem)
    onChange(newData)
    
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [data, draggedIndex, onChange])

  // 拖拽排序 - 对象
  const handleObjectDragStart = useCallback((e: React.DragEvent, key: string) => {
    e.stopPropagation()
    setDraggedIndex(key)
  }, [])

  const handleObjectDragOver = useCallback((e: React.DragEvent, key: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (draggedIndex !== null && draggedIndex !== key) {
      setDragOverIndex(key)
    }
  }, [draggedIndex])

  const handleObjectDragEnd = useCallback(() => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [])

  const handleObjectDrop = useCallback((e: React.DragEvent, dropKey: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (draggedIndex === null || draggedIndex === dropKey) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const keys = Object.keys(data)
    const draggedKey = draggedIndex as string
    const draggedIndexPos = keys.indexOf(draggedKey)
    const dropIndexPos = keys.indexOf(dropKey)

    if (draggedIndexPos === -1 || dropIndexPos === -1) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    // 创建新的有序对象
    const newData: any = {}
    const reorderedKeys = [...keys]
    reorderedKeys.splice(draggedIndexPos, 1)
    reorderedKeys.splice(dropIndexPos, 0, draggedKey)

    reorderedKeys.forEach(key => {
      newData[key] = data[key]
    })

    onChange(newData)
    
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [data, draggedIndex, onChange])

  // 生成路径文本（格式：/a/b/c/d:3）
  const getPathText = useCallback((currentPath: string, value: any): string => {
    // 将路径转换为 /a/b/c/d 格式
    // 处理格式如: "a.b.c.d", "[0]", "a[0]", "a.b[0]" 等
    const pathParts: string[] = []
    let currentPart = ''
    
    for (let i = 0; i < currentPath.length; i++) {
      const char = currentPath[i]
      if (char === '.' || char === '[' || char === ']') {
        if (currentPart) {
          pathParts.push(currentPart)
          currentPart = ''
        }
      } else {
        currentPart += char
      }
    }
    if (currentPart) {
      pathParts.push(currentPart)
    }
    
    const pathStr = pathParts.length > 0 ? '/' + pathParts.join('/') : ''
    
    // 获取值的字符串表示
    let valueStr = ''
    if (value === null || value === undefined) {
      valueStr = 'null'
    } else if (typeof value === 'string') {
      valueStr = value
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      valueStr = String(value)
    } else if (Array.isArray(value)) {
      valueStr = `[${value.length} items]`
    } else if (typeof value === 'object') {
      valueStr = `{${Object.keys(value).length} keys}`
    }
    
    return `${pathStr}:${valueStr}`
  }, [])

  // 显示提示消息的状态（只在顶层使用）
  const [toastMessage, setToastMessage] = useState<string>('')
  const toastTimeoutRef = useRef<number | null>(null)

  // 清理toast定时器
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
      }
    }
  }, [])

  // 显示提示消息（只在顶层显示）
  const showToast = useCallback((message: string) => {
    if (!path) {
      // 只在顶层显示toast
      setToastMessage(message)
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
      }
      toastTimeoutRef.current = window.setTimeout(() => {
        setToastMessage('')
      }, 2000)
    }
  }, [path])

  // 复制路径文本到剪贴板
  const copyPathText = useCallback(async (currentPath: string, value: any) => {
    const pathText = getPathText(currentPath, value)
    try {
      await navigator.clipboard.writeText(pathText)
      showToast('已复制')
    } catch (err) {
      // 如果剪贴板API不可用，使用fallback方法
      const textArea = document.createElement('textarea')
      textArea.value = pathText
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        showToast('已复制')
      } catch (fallbackErr) {
        showToast('复制失败，请手动复制')
      }
      document.body.removeChild(textArea)
    }
  }, [getPathText, showToast])

  if (data === null || data === undefined) {
    return (
      <div className="yaml-form-item">
        <input
          type="text"
          value="null"
          readOnly
          className="form-input readonly"
        />
      </div>
    )
  }

  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    const isMatch = searchQuery && String(data).toLowerCase().includes(searchQuery.toLowerCase())
    
    if (typeof data === 'boolean') {
      return (
        <div className={`yaml-form-item ${isMatch ? 'search-match' : ''}`}>
          <div className="boolean-toggle">
            <button
              className={`toggle-option ${!data ? 'active' : ''}`}
              onClick={() => onChange(false)}
              type="button"
            >
              {searchQuery ? highlightText('False', searchQuery) : 'False'}
            </button>
            <button
              className={`toggle-option ${data ? 'active' : ''}`}
              onClick={() => onChange(true)}
              type="button"
            >
              {searchQuery ? highlightText('True', searchQuery) : 'True'}
            </button>
          </div>
        </div>
      )
    }
    
    const stringValue = String(data)
    // 对于字符串类型，根据长度决定使用 input 还是 textarea
    const isLongString = typeof data === 'string' && stringValue.length > 50
    const inputSize = typeof data === 'string' && !isLongString
      ? Math.max(10, Math.min(stringValue.length + 2, 60))
      : undefined
    
    return (
      <div className={`yaml-form-item ${isMatch ? 'search-match' : ''}`}>
        {isLongString ? (
          <textarea
            value={stringValue}
            onChange={e => onChange(e.target.value)}
            className={`form-input form-textarea ${isMatch && searchQuery ? 'search-match-input' : ''}`}
            rows={Math.min(Math.max(3, Math.ceil(stringValue.length / 50)), 10)}
          />
        ) : (
          <input
            type={typeof data === 'number' ? 'number' : 'text'}
            value={stringValue}
            size={inputSize}
            onChange={e => {
              let value: any = e.target.value
              if (typeof data === 'number') {
                value = parseFloat(value) || 0
              }
              onChange(value)
            }}
            className={`form-input ${typeof data === 'string' ? 'form-input-string' : ''} ${isMatch && searchQuery ? 'search-match-input' : ''}`}
          />
        )}
      </div>
    )
  }

  if (Array.isArray(data)) {
    // 过滤数组项
    const filteredItems = searchQuery
      ? data.map((item, index) => {
          const itemPath = path ? `${path}[${index}]` : `[${index}]`
          return { item, index, itemPath, matches: matchesSearch(String(index), item, itemPath) || hasMatchingChild(item, itemPath) }
        }).filter(({ matches }) => matches)
      : data.map((item, index) => {
          const itemPath = path ? `${path}[${index}]` : `[${index}]`
          return { item, index, itemPath, matches: true }
        })

    return (
      <div className="yaml-form-array">
        {filteredItems.length === 0 && searchQuery ? (
          <div className="search-no-results">
            未找到匹配项
          </div>
        ) : (
          filteredItems.map(({ item, index, itemPath }) => {
          const fullKey = path ? `${path}[${index}]` : String(index)
          const isExpanded = expanded.has(fullKey)
          const isObject = typeof item === 'object' && item !== null && !Array.isArray(item)
          const isNestedArray = Array.isArray(item)
          const isMatch = matchesSearch(String(index), item, itemPath)

          const isHighlighted = highlightedPath === itemPath
          
          return (
            <div 
              key={index} 
              ref={(el) => {
                if (el) {
                  pathElementRefs.current.set(itemPath, el)
                } else {
                  pathElementRefs.current.delete(itemPath)
                }
              }}
              data-path={itemPath}
              className={`yaml-form-array-item ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''} ${isMatch ? 'search-match' : ''} ${isHighlighted ? 'path-highlighted' : ''}`}
              draggable
              onDragStart={(e) => handleArrayDragStart(e, index)}
              onDragOver={(e) => handleArrayDragOver(e, index)}
              onDragEnd={handleArrayDragEnd}
              onDrop={(e) => handleArrayDrop(e, index)}
            >
              <div className="array-item-header">
                <div 
                  className="drag-handle"
                  title="拖拽排序"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <DragHandleIcon size={14} />
                </div>
                <button
                  className="expand-btn"
                  onClick={() => {
                    // 对于数组项，需要使用完整路径格式 path[index]
                    const arrayKey = path ? `${path}[${index}]` : String(index)
                    setExpanded((prev: Set<string>) => {
                      const next = new Set(prev)
                      if (next.has(arrayKey)) {
                        next.delete(arrayKey)
                      } else {
                        next.add(arrayKey)
                      }
                      return next
                    })
                  }}
                  style={{ visibility: isObject || isNestedArray ? 'visible' : 'hidden' }}
                >
                  {isExpanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
                </button>
                <span className="array-index">{highlightText(`[${index}]`, searchQuery)}</span>
                <TypeSelector itemKey={String(index)} currentValue={item} />
                {commentsMap.has(itemPath) && (
                  <span className="inline-comment" title={commentsMap.get(itemPath)}>
                    {commentsMap.get(itemPath)}
                  </span>
                )}
                {isObject || isNestedArray ? (
                  <span className="type-badge">{isNestedArray ? '数组' : '对象'}</span>
                ) : (
                  <YAMLForm
                    data={item}
                    onChange={value => updateValue(String(index), value)}
                    path={itemPath}
                    expanded={expanded}
                    onExpandedChange={setExpanded}
                    searchQuery={searchQuery}
                    onMatchCountChange={onMatchCountChange}
                    commentsMap={commentsMap}
                    onLocatePath={onLocatePath}
                  />
                )}
                {onLocatePath && (
                  <button
                    className="locate-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      onLocatePath(itemPath)
                    }}
                    title="定位到编辑器"
                  >
                    <LocateIcon size={14} />
                  </button>
                )}
                <button
                  className="copy-path-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    copyPathText(itemPath, item)
                  }}
                  title="复制路径"
                >
                  <CopyIcon size={14} />
                </button>
                <button
                  className="delete-btn"
                  onClick={() => deleteItem(String(index))}
                  title="删除此项"
                >
                  <DeleteIcon size={14} />
                </button>
              </div>
              {(isObject || isNestedArray) && isExpanded && (
                <div className="nested-content">
                  <YAMLForm
                    data={item}
                    onChange={value => updateValue(String(index), value)}
                    path={itemPath}
                    expanded={expanded}
                    onExpandedChange={setExpanded}
                    searchQuery={searchQuery}
                    onMatchCountChange={onMatchCountChange}
                    commentsMap={commentsMap}
                    onLocatePath={onLocatePath}
                  />
                </div>
              )}
            </div>
          )
        })
      )}
        {(!searchQuery || filteredItems.length > 0) && (
          <div className="add-item-container" ref={addMenuArrayRef}>
          <button 
            className="add-btn-icon" 
            onClick={() => setShowAddMenuArray(!showAddMenuArray)}
            title="添加项"
          >
            <PlusIcon size={14} />
          </button>
          {showAddMenuArray && (
            <div className="add-menu">
              <button onClick={() => addItem('string')} className="add-menu-item">
                字符串
              </button>
              <button onClick={() => addItem('number')} className="add-menu-item">
                数字
              </button>
              <button onClick={() => addItem('boolean')} className="add-menu-item">
                布尔值
              </button>
              <button onClick={() => addItem('object')} className="add-menu-item">
                对象
              </button>
              <button onClick={() => addItem('array')} className="add-menu-item">
                数组
              </button>
            </div>
          )}
          </div>
        )}
      </div>
    )
  }

  // Object
  const keys = Object.keys(data)
  const isEmpty = keys.length === 0 && !path
  
  // 过滤对象键
  const filteredKeys = searchQuery
    ? keys.filter(key => {
        const value = data[key]
        const itemPath = path ? `${path}.${key}` : key
        return matchesSearch(key, value, itemPath) || hasMatchingChild(value, itemPath)
      })
    : keys

  return (
    <div className={`yaml-form-object ${isEmpty ? 'empty-object' : ''}`}>
        {filteredKeys.length === 0 && searchQuery ? (
          <div className="search-no-results">
            未找到匹配项
          </div>
        ) : (
        filteredKeys.map(key => {
        const value = data[key]
        const itemPath = path ? `${path}.${key}` : key
        const fullKey = path ? `${path}.${key}` : key
        const isExpanded = expanded.has(fullKey)
        const isObject = typeof value === 'object' && value !== null && !Array.isArray(value)
        const isNestedArray = Array.isArray(value)
        const isMatch = matchesSearch(key, value, itemPath)

        const isHighlighted = highlightedPath === itemPath
        
        return (
          <div 
            key={key}
            ref={(el) => {
              if (el) {
                pathElementRefs.current.set(itemPath, el)
              } else {
                pathElementRefs.current.delete(itemPath)
              }
            }}
            data-path={itemPath}
            className={`yaml-form-object-item ${draggedIndex === key ? 'dragging' : ''} ${dragOverIndex === key ? 'drag-over' : ''} ${isMatch ? 'search-match' : ''} ${isHighlighted ? 'path-highlighted' : ''}`}
            draggable
            onDragStart={(e) => handleObjectDragStart(e, key)}
            onDragOver={(e) => handleObjectDragOver(e, key)}
            onDragEnd={handleObjectDragEnd}
            onDrop={(e) => handleObjectDrop(e, key)}
          >
            <div className="object-item-header">
              <div 
                className="drag-handle"
                title="拖拽排序"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <DragHandleIcon size={14} />
              </div>
              <button
                className="expand-btn"
                onClick={() => toggleExpand(key)}
                style={{ visibility: isObject || isNestedArray ? 'visible' : 'hidden' }}
              >
                {isExpanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
              </button>
              <input
                ref={(el) => {
                  if (el) {
                    keyInputRefs.current.set(key, el)
                  } else {
                    keyInputRefs.current.delete(key)
                  }
                }}
                type="text"
                value={key}
                onChange={e => {
                  const newKey = e.target.value
                  const cursorPosition = e.target.selectionStart || 0
                  
                  if (newKey && newKey !== key) {
                    // 保持原有的键顺序，在相同位置替换 key
                    const keys = Object.keys(data)
                    const oldKeyIndex = keys.indexOf(key)
                    const newData: any = {}
                    
                    // 按照原顺序构建新对象，将旧 key 替换为新 key
                    keys.forEach((k, index) => {
                      if (index === oldKeyIndex) {
                        // 在旧 key 的位置插入新 key
                        newData[newKey] = data[key]
                      } else if (k !== key) {
                        // 其他键保持不变
                        newData[k] = data[k]
                      }
                      // 跳过旧 key（已经在上面处理了）
                    })
                    
                    onChange(newData)
                    
                    // 恢复焦点和光标位置
                    setTimeout(() => {
                      const inputRef = keyInputRefs.current.get(newKey)
                      if (inputRef) {
                        inputRef.focus()
                        const newCursorPos = Math.min(cursorPosition, newKey.length)
                        inputRef.setSelectionRange(newCursorPos, newCursorPos)
                      }
                    }, 0)
                  }
                }}
                className={`key-input ${isMatch && searchQuery ? 'search-match-input' : ''}`}
              />
              <TypeSelector itemKey={key} currentValue={value} />
              {commentsMap.has(itemPath) && (
                <span className="inline-comment" title={commentsMap.get(itemPath)}>
                  {commentsMap.get(itemPath)}
                </span>
              )}
              {!(isObject || isNestedArray) && (
                <YAMLForm
                  data={value}
                  onChange={newValue => updateValue(key, newValue)}
                  path={itemPath}
                  expanded={expanded}
                  onExpandedChange={setExpanded}
                  searchQuery={searchQuery}
                  onMatchCountChange={onMatchCountChange}
                  commentsMap={commentsMap}
                  onLocatePath={onLocatePath}
                />
              )}
              {onLocatePath && (
                <button
                  className="locate-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    onLocatePath(itemPath)
                  }}
                  title="定位到编辑器"
                >
                  <LocateIcon size={14} />
                </button>
              )}
              <button
                className="copy-path-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  copyPathText(itemPath, value)
                }}
                title="复制路径"
              >
                <CopyIcon size={14} />
              </button>
              <button
                className="delete-btn"
                onClick={() => deleteItem(key)}
                title="删除此项"
              >
                <DeleteIcon size={14} />
              </button>
            </div>
            {(isObject || isNestedArray) && isExpanded && (
              <div className="nested-content">
                <YAMLForm
                  data={value}
                  onChange={newValue => updateValue(key, newValue)}
                  path={itemPath}
                  expanded={expanded}
                  onExpandedChange={setExpanded}
                    searchQuery={searchQuery}
                    onMatchCountChange={onMatchCountChange}
                    commentsMap={commentsMap}
                    onLocatePath={onLocatePath}
                  />
                </div>
            )}
          </div>
        )
      })
      )}
      {(!searchQuery || filteredKeys.length > 0) && (
        <div className="add-item-container" ref={addMenuObjectRef}>
        <button 
          className="add-btn-icon" 
          onClick={() => setShowAddMenuObject(!showAddMenuObject)}
          title="添加键值对"
        >
          <PlusIcon size={14} />
        </button>
        {showAddMenuObject && (
          <div className="add-menu">
            <button onClick={() => addItem('string')} className="add-menu-item">
              字符串
            </button>
            <button onClick={() => addItem('number')} className="add-menu-item">
              数字
            </button>
            <button onClick={() => addItem('boolean')} className="add-menu-item">
              布尔值
            </button>
            <button onClick={() => addItem('object')} className="add-menu-item">
              对象
            </button>
            <button onClick={() => addItem('array')} className="add-menu-item">
              数组
            </button>
          </div>
        )}
        </div>
      )}
      {!path && toastMessage && (
        <div className="toast-message">
          {toastMessage}
        </div>
      )}
    </div>
  )
})

YAMLForm.displayName = 'YAMLForm'

export default YAMLForm

