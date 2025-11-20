import { useMemo } from 'react'
import './StatsPanel.css'

interface StatsPanelProps {
  data: any
  yamlText: string
  isOpen: boolean
  onToggle: () => void
}

interface TypeDistribution {
  string: number
  number: number
  boolean: number
  object: number
  array: number
}

export default function StatsPanel({ data, yamlText, isOpen, onToggle }: StatsPanelProps) {
  const stats = useMemo(() => {
    // 计算配置项数量
    const countItems = (obj: any): number => {
      if (obj === null || obj === undefined) return 0
      if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
        return 1
      }
      if (Array.isArray(obj)) {
        return obj.reduce((sum, item) => sum + countItems(item), 0)
      }
      if (typeof obj === 'object') {
        return Object.values(obj).reduce((sum: number, value) => sum + countItems(value), 0)
      }
      return 0
    }

    // 计算嵌套深度
    const calculateDepth = (obj: any, currentDepth: number = 0): number => {
      if (obj === null || obj === undefined) return currentDepth
      if (typeof obj !== 'object') return currentDepth
      
      if (Array.isArray(obj)) {
        if (obj.length === 0) return currentDepth
        return Math.max(...obj.map(item => calculateDepth(item, currentDepth + 1)), currentDepth)
      }
      
      const keys = Object.keys(obj)
      if (keys.length === 0) return currentDepth
      
      return Math.max(...keys.map(key => calculateDepth(obj[key], currentDepth + 1)), currentDepth)
    }

    // 计算类型分布
    const calculateTypeDistribution = (obj: any): TypeDistribution => {
      const distribution: TypeDistribution = {
        string: 0,
        number: 0,
        boolean: 0,
        object: 0,
        array: 0,
      }

      const traverse = (value: any) => {
        if (value === null || value === undefined) {
          distribution.string++
          return
        }
        
        if (Array.isArray(value)) {
          distribution.array++
          value.forEach(item => traverse(item))
        } else if (typeof value === 'object') {
          distribution.object++
          Object.values(value).forEach(item => traverse(item))
        } else if (typeof value === 'string') {
          distribution.string++
        } else if (typeof value === 'number') {
          distribution.number++
        } else if (typeof value === 'boolean') {
          distribution.boolean++
        }
      }

      traverse(obj)
      return distribution
    }

    // 计算文件大小（字节）
    const fileSize = new Blob([yamlText]).size

    // 格式化文件大小
    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
    }

    const itemCount = countItems(data)
    const maxDepth = calculateDepth(data)
    const typeDistribution = calculateTypeDistribution(data)
    const totalTypes = Object.values(typeDistribution).reduce((sum, count) => sum + count, 0)

    return {
      itemCount,
      maxDepth,
      fileSize: formatFileSize(fileSize),
      fileSizeBytes: fileSize,
      typeDistribution,
      totalTypes,
    }
  }, [data, yamlText])

  return (
    <div className={`stats-panel ${isOpen ? 'open' : ''}`}>
      <div className="stats-panel-header" onClick={onToggle}>
        <span className="stats-panel-title">配置统计</span>
        <span className="stats-panel-toggle">
          {isOpen ? '▼' : '▶'}
        </span>
      </div>
      {isOpen && (
        <div className="stats-panel-content">
          <div className="stat-item">
            <div className="stat-label">配置项数量</div>
            <div className="stat-value">{stats.itemCount}</div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">嵌套深度</div>
            <div className="stat-value">{stats.maxDepth}</div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">文件大小</div>
            <div className="stat-value">{stats.fileSize}</div>
          </div>
          
          <div className="stat-item stat-item-full">
            <div className="stat-label">类型分布</div>
            <div className="type-distribution">
              {stats.typeDistribution.string > 0 && (
                <div className="type-item">
                  <span className="type-name">字符串</span>
                  <div className="type-bar-container">
                    <div 
                      className="type-bar type-string"
                      style={{ width: `${(stats.typeDistribution.string / stats.totalTypes) * 100}%` }}
                    />
                  </div>
                  <span className="type-count">{stats.typeDistribution.string}</span>
                </div>
              )}
              {stats.typeDistribution.number > 0 && (
                <div className="type-item">
                  <span className="type-name">数字</span>
                  <div className="type-bar-container">
                    <div 
                      className="type-bar type-number"
                      style={{ width: `${(stats.typeDistribution.number / stats.totalTypes) * 100}%` }}
                    />
                  </div>
                  <span className="type-count">{stats.typeDistribution.number}</span>
                </div>
              )}
              {stats.typeDistribution.boolean > 0 && (
                <div className="type-item">
                  <span className="type-name">布尔值</span>
                  <div className="type-bar-container">
                    <div 
                      className="type-bar type-boolean"
                      style={{ width: `${(stats.typeDistribution.boolean / stats.totalTypes) * 100}%` }}
                    />
                  </div>
                  <span className="type-count">{stats.typeDistribution.boolean}</span>
                </div>
              )}
              {stats.typeDistribution.object > 0 && (
                <div className="type-item">
                  <span className="type-name">对象</span>
                  <div className="type-bar-container">
                    <div 
                      className="type-bar type-object"
                      style={{ width: `${(stats.typeDistribution.object / stats.totalTypes) * 100}%` }}
                    />
                  </div>
                  <span className="type-count">{stats.typeDistribution.object}</span>
                </div>
              )}
              {stats.typeDistribution.array > 0 && (
                <div className="type-item">
                  <span className="type-name">数组</span>
                  <div className="type-bar-container">
                    <div 
                      className="type-bar type-array"
                      style={{ width: `${(stats.typeDistribution.array / stats.totalTypes) * 100}%` }}
                    />
                  </div>
                  <span className="type-count">{stats.typeDistribution.array}</span>
                </div>
              )}
              {stats.totalTypes === 0 && (
                <div className="type-item-empty">暂无数据</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

