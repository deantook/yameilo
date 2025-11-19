import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { ChevronDownIcon, ChevronRightIcon, DeleteIcon, PlusIcon } from './Icons'
import './YAMLForm.css'

interface YAMLFormProps {
  data: any
  onChange: (data: any) => void
  path?: string
}

export interface YAMLFormHandle {
  expandAll: () => void
  collapseAll: () => void
}

const YAMLForm = forwardRef<YAMLFormHandle, YAMLFormProps>(({ data, onChange, path = '' }, ref) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showAddMenuArray, setShowAddMenuArray] = useState(false)
  const [showAddMenuObject, setShowAddMenuObject] = useState(false)
  const [showTypeMenu, setShowTypeMenu] = useState<Set<string>>(new Set())
  const addMenuArrayRef = useRef<HTMLDivElement>(null)
  const addMenuObjectRef = useRef<HTMLDivElement>(null)
  const typeMenuRefs = useRef<Map<string, HTMLDivElement>>(new Map())

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
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  // 递归收集所有可展开的 key（使用相对路径）
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
  }, [data, path, collectExpandableKeys])

  // 全部折叠（只在顶层调用）
  const collapseAll = useCallback(() => {
    if (path) return // 只在顶层执行
    setExpanded(new Set())
  }, [path])

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
    if (typeof data === 'boolean') {
      return (
        <div className="yaml-form-item">
          <div className="boolean-toggle">
            <button
              className={`toggle-option ${!data ? 'active' : ''}`}
              onClick={() => onChange(false)}
              type="button"
            >
              False
            </button>
            <button
              className={`toggle-option ${data ? 'active' : ''}`}
              onClick={() => onChange(true)}
              type="button"
            >
              True
            </button>
          </div>
        </div>
      )
    }
    
    return (
      <div className="yaml-form-item">
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
          className="form-input"
        />
      </div>
    )
  }

  if (Array.isArray(data)) {
    return (
      <div className="yaml-form-array">
        {data.map((item, index) => {
          const itemPath = path ? `${path}[${index}]` : `[${index}]`
          const isExpanded = expanded.has(String(index))
          const isObject = typeof item === 'object' && item !== null && !Array.isArray(item)
          const isNestedArray = Array.isArray(item)

          return (
            <div key={index} className="yaml-form-array-item">
              <div className="array-item-header">
                <button
                  className="expand-btn"
                  onClick={() => toggleExpand(String(index))}
                  style={{ visibility: isObject || isNestedArray ? 'visible' : 'hidden' }}
                >
                  {isExpanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
                </button>
                <span className="array-index">[{index}]</span>
                <TypeSelector itemKey={String(index)} currentValue={item} />
                {isObject || isNestedArray ? (
                  <span className="type-badge">{isNestedArray ? '数组' : '对象'}</span>
                ) : (
                  <YAMLForm
                    data={item}
                    onChange={value => updateValue(String(index), value)}
                    path={itemPath}
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
                  />
                </div>
              )}
            </div>
          )
        })}
        <div className="add-item-container" ref={addMenuArrayRef}>
          <button 
            className="add-btn" 
            onClick={() => setShowAddMenuArray(!showAddMenuArray)}
          >
            <PlusIcon size={14} />
            <span>添加项</span>
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
      </div>
    )
  }

  // Object
  const keys = Object.keys(data)
  const isEmpty = keys.length === 0 && !path
  return (
    <div className={`yaml-form-object ${isEmpty ? 'empty-object' : ''}`}>
      {keys.map(key => {
        const value = data[key]
        const itemPath = path ? `${path}.${key}` : key
        const isExpanded = expanded.has(key)
        const isObject = typeof value === 'object' && value !== null && !Array.isArray(value)
        const isNestedArray = Array.isArray(value)

        return (
          <div key={key} className="yaml-form-object-item">
            <div className="object-item-header">
              <button
                className="expand-btn"
                onClick={() => toggleExpand(key)}
                style={{ visibility: isObject || isNestedArray ? 'visible' : 'hidden' }}
              >
                {isExpanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
              </button>
              <input
                type="text"
                value={key}
                onChange={e => {
                  const newKey = e.target.value
                  if (newKey && newKey !== key) {
                    const newData = { ...data }
                    newData[newKey] = newData[key]
                    delete newData[key]
                    onChange(newData)
                  }
                }}
                className="key-input"
              />
              <TypeSelector itemKey={key} currentValue={value} />
              {!(isObject || isNestedArray) && (
                <YAMLForm
                  data={value}
                  onChange={newValue => updateValue(key, newValue)}
                  path={itemPath}
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
                />
              </div>
            )}
          </div>
        )
      })}
      <div className="add-item-container" ref={addMenuObjectRef}>
        <button 
          className="add-btn" 
          onClick={() => setShowAddMenuObject(!showAddMenuObject)}
        >
          <PlusIcon size={14} />
          <span>添加键值对</span>
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
    </div>
  )
})

YAMLForm.displayName = 'YAMLForm'

export default YAMLForm

