import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { ChevronDownIcon, ChevronRightIcon, DeleteIcon, PlusIcon, DragHandleIcon } from './Icons'
import './YAMLForm.css'

interface YAMLFormProps {
  data: any
  onChange: (data: any) => void
  path?: string
  expanded?: Set<string>
  onExpandedChange?: (expanded: Set<string>) => void
  searchQuery?: string
  onMatchCountChange?: (count: number) => void
}

export interface YAMLFormHandle {
  expandAll: () => void
  collapseAll: () => void
}

const YAMLForm = forwardRef<YAMLFormHandle, YAMLFormProps>(({ data, onChange, path = '', expanded: expandedProp, onExpandedChange, searchQuery = '', onMatchCountChange }, ref) => {
  // 如果提供了 expanded prop，使用它；否则使用本地状态（用于嵌套组件）
  const [localExpanded, setLocalExpanded] = useState<Set<string>>(new Set())
  const expanded = expandedProp !== undefined ? expandedProp : localExpanded
  
  // 统一的 setExpanded 函数，处理两种情况
  const setExpanded = useCallback((value: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    if (onExpandedChange) {
      // 如果提供了 onExpandedChange，直接调用
      const newValue = typeof value === 'function' ? value(expanded) : value
      onExpandedChange(newValue)
    } else {
      // 否则使用本地状态更新
      setLocalExpanded(value)
    }
  }, [onExpandedChange, expanded])
  const [showAddMenuArray, setShowAddMenuArray] = useState(false)
  const [showAddMenuObject, setShowAddMenuObject] = useState(false)
  const [showTypeMenu, setShowTypeMenu] = useState<Set<string>>(new Set())
  const addMenuArrayRef = useRef<HTMLDivElement>(null)
  const addMenuObjectRef = useRef<HTMLDivElement>(null)
  const typeMenuRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const keyInputRefs = useRef<Map<string, HTMLInputElement>>(new Map())
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
    
    return (
      <div className={`yaml-form-item ${isMatch ? 'search-match' : ''}`}>
        <input
          type={typeof data === 'number' ? 'number' : 'text'}
          value={String(data)}
          onChange={e => {
            let value: any = e.target.value
            if (typeof data === 'number') {
              value = parseFloat(value) || 0
            }
            onChange(value)
          }}
          className={`form-input ${isMatch && searchQuery ? 'search-match-input' : ''}`}
        />
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

          return (
            <div 
              key={index} 
              className={`yaml-form-array-item ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''} ${isMatch ? 'search-match' : ''}`}
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
                  onClick={() => toggleExpand(String(index))}
                  style={{ visibility: isObject || isNestedArray ? 'visible' : 'hidden' }}
                >
                  {isExpanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
                </button>
                <span className="array-index">{highlightText(`[${index}]`, searchQuery)}</span>
                <TypeSelector itemKey={String(index)} currentValue={item} />
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
                  />
                )}
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

        return (
          <div 
            key={key} 
            className={`yaml-form-object-item ${draggedIndex === key ? 'dragging' : ''} ${dragOverIndex === key ? 'drag-over' : ''} ${isMatch ? 'search-match' : ''}`}
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
                    const newData = { ...data }
                    newData[newKey] = newData[key]
                    delete newData[key]
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
              {!(isObject || isNestedArray) && (
                <YAMLForm
                  data={value}
                  onChange={newValue => updateValue(key, newValue)}
                  path={itemPath}
                  expanded={expanded}
                  onExpandedChange={setExpanded}
                  searchQuery={searchQuery}
                  onMatchCountChange={onMatchCountChange}
                />
              )}
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
    </div>
  )
})

YAMLForm.displayName = 'YAMLForm'

export default YAMLForm

