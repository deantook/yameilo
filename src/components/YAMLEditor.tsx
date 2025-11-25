import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import Editor from '@monaco-editor/react'
import * as YAML from 'yaml'
import type { OnChange, OnMount } from '@monaco-editor/react'
import './YAMLEditor.css'

interface YAMLEditorProps {
  value: string
  onChange: (value: string) => void
  onParseError?: (error: string) => void
  theme?: 'light' | 'dark'
  onPathClick?: (path: string) => void
}

export interface YAMLEditorHandle {
  format: () => void
  locatePath: (path: string) => void
}

const YAMLEditor = forwardRef<YAMLEditorHandle, YAMLEditorProps>(
  ({ value, onChange, onParseError, theme = 'light', onPathClick }, ref) => {
    const editorRef = useRef<any>(null)
    const isInternalUpdate = useRef(false)

    // 根据路径找到对应的行号
    const getLineNumberFromPath = useCallback((targetPath: string): number | null => {
      if (!editorRef.current) {
        return null
      }

      const currentValue = editorRef.current.getValue()
      if (!currentValue) {
        return null
      }

      try {
        const lines = currentValue.split('\n')
        
        // 构建路径栈来跟踪当前路径
        // 每个元素可以是对象键（字符串）或数组索引（数字）
        const pathStack: Array<{ type: 'key' | 'array'; value: string | number; indent: number }> = []
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          const trimmed = line.trim()
          
          // 跳过空行和注释
          if (!trimmed || trimmed.startsWith('#')) continue
          
          const indent = (line.match(/^(\s*)/)?.[1] || '').length
          const indentLevel = Math.floor(indent / 2)
          
          // 移除比当前行缩进更深的项
          while (pathStack.length > 0 && pathStack[pathStack.length - 1].indent >= indentLevel) {
            pathStack.pop()
          }
          
          if (trimmed.startsWith('-')) {
            // 数组项 - 计算索引
            let arrayIndex = 0
            for (let j = i - 1; j >= 0; j--) {
              const prevLine = lines[j]
              const prevTrimmed = prevLine.trim()
              if (!prevTrimmed || prevTrimmed.startsWith('#')) continue
              
              const prevIndent = (prevLine.match(/^(\s*)/)?.[1] || '').length
              const prevIndentLevel = Math.floor(prevIndent / 2)
              
              if (prevIndentLevel === indentLevel && prevTrimmed.startsWith('-')) {
                arrayIndex++
              } else if (prevIndentLevel < indentLevel) {
                // 找到了父级，停止计数
                break
              }
            }
            
            // 构建当前路径
            let currentPath = ''
            pathStack.forEach(item => {
              if (item.type === 'key') {
                if (currentPath) {
                  currentPath += '.'
                }
                currentPath += item.value
              } else if (item.type === 'array') {
                currentPath += `[${item.value}]`
              }
            })
            // 添加当前数组索引
            currentPath += `[${arrayIndex}]`
            
            // 检查是否匹配目标路径
            if (currentPath === targetPath) {
              return i + 1 // 返回行号（1-based）
            }
            
            // 将数组索引添加到路径栈
            pathStack.push({ type: 'array', value: arrayIndex, indent: indentLevel })
          } else if (trimmed.includes(':')) {
            // key-value 对
            const colonIndex = trimmed.indexOf(':')
            const key = trimmed.substring(0, colonIndex).trim()
            
            if (key) {
              // 构建当前路径
              let currentPath = ''
              pathStack.forEach(item => {
                if (item.type === 'key') {
                  if (currentPath) {
                    currentPath += '.'
                  }
                  currentPath += item.value
                } else if (item.type === 'array') {
                  currentPath += `[${item.value}]`
                }
              })
              // 添加当前键
              if (currentPath) {
                currentPath += '.' + key
              } else {
                currentPath = key
              }
              
              // 检查是否匹配目标路径
              if (currentPath === targetPath) {
                return i + 1 // 返回行号（1-based）
              }
              
              // 添加到路径栈（只存储对象键）
              pathStack.push({ type: 'key', value: key, indent: indentLevel })
            }
          }
        }
        
        return null
      } catch (error) {
        return null
      }
    }, [])

    // 根据光标位置解析 YAML 路径
    const getPathFromPosition = useCallback((lineNumber: number): string | null => {
      if (!editorRef.current) {
        return null
      }

      // 从编辑器获取当前值，而不是依赖 prop
      const currentValue = editorRef.current.getValue()
      if (!currentValue) {
        return null
      }

      try {
        const lines = currentValue.split('\n')
        if (lineNumber < 1 || lineNumber > lines.length) {
          return null
        }
        
        const lineText = lines[lineNumber - 1]
        const trimmed = lineText.trim()
        
        // 跳过空行和注释
        if (!trimmed || trimmed.startsWith('#')) {
          return null
        }
        
        // 计算当前行的缩进
        const lineIndent = (lineText.match(/^(\s*)/)?.[1] || '').length
        const lineIndentLevel = Math.floor(lineIndent / 2)
        
        // 构建路径栈
        const pathStack: Array<{ key: string; indent: number }> = []
        
        for (let i = 0; i < lineNumber; i++) {
          const line = lines[i]
          const lineTrimmed = line.trim()
          
          // 跳过空行和注释
          if (!lineTrimmed || lineTrimmed.startsWith('#')) continue
          
          const indent = (line.match(/^(\s*)/)?.[1] || '').length
          const indentLevel = Math.floor(indent / 2)
          
          // 移除比当前行缩进更深的项（使用缩进级别比较）
          while (pathStack.length > 0 && pathStack[pathStack.length - 1].indent >= indentLevel) {
            pathStack.pop()
          }
          
          if (lineTrimmed.startsWith('-')) {
            // 数组项 - 计算索引
            if (i === lineNumber - 1) {
              // 这是目标行，计算数组索引
              let arrayIndex = 0
              for (let j = i - 1; j >= 0; j--) {
                const prevLine = lines[j]
                const prevTrimmed = prevLine.trim()
                if (!prevTrimmed || prevTrimmed.startsWith('#')) continue
                
                const prevIndent = (prevLine.match(/^(\s*)/)?.[1] || '').length
                const prevIndentLevel = Math.floor(prevIndent / 2)
                if (prevIndentLevel === lineIndentLevel && prevTrimmed.startsWith('-')) {
                  arrayIndex++
                } else if (prevIndentLevel < lineIndentLevel) {
                  // 找到了父级，停止计数
                  break
                }
              }
              
              // 构建路径
              let result = ''
              pathStack.forEach(item => {
                if (result) {
                  result += '.'
                }
                result += item.key
              })
              result += `[${arrayIndex}]`
              
              return result || null
            }
            // 数组项不作为路径的一部分，跳过
          } else if (lineTrimmed.includes(':')) {
            // key-value 对
            const colonIndex = lineTrimmed.indexOf(':')
            const key = lineTrimmed.substring(0, colonIndex).trim()
            
            if (key) {
              if (i === lineNumber - 1) {
                // 这是目标行，构建路径
                const pathParts: string[] = []
                pathStack.forEach(item => {
                  pathParts.push(item.key)
                })
                pathParts.push(key)
                
                const result = pathParts.join('.')
                return result
              } else {
                // 添加到路径栈
                pathStack.push({ key: key, indent: indentLevel })
              }
            }
          }
        }
        
        return null
      } catch (error) {
        return null
      }
    }, []) // 不依赖 value，因为从编辑器获取

    const handleEditorDidMount: OnMount = (editor: any, monaco: any) => {
      editorRef.current = editor

      // 配置 YAML 语言支持
      monaco.languages.setLanguageConfiguration('yaml', {
        comments: {
          lineComment: '#',
        },
        brackets: [
          ['{', '}'],
          ['[', ']'],
        ],
        autoClosingPairs: [
          { open: '{', close: '}' },
          { open: '[', close: ']' },
          { open: '"', close: '"' },
          { open: "'", close: "'" },
        ],
        surroundingPairs: [
          { open: '{', close: '}' },
          { open: '[', close: ']' },
          { open: '"', close: '"' },
          { open: "'", close: "'" },
        ],
      })

      // 配置编辑器选项
      editor.updateOptions({
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 14,
        lineNumbers: 'on',
        renderWhitespace: 'selection',
        wordWrap: 'on',
        automaticLayout: true,
      })

      // 监听鼠标点击事件
      if (onPathClick) {
        editor.onMouseDown(() => {
          // 延迟一下，确保光标位置已更新
          setTimeout(() => {
            const position = editor.getPosition()
            if (position) {
              const path = getPathFromPosition(position.lineNumber)
              if (path && onPathClick) {
                onPathClick(path)
              }
            }
          }, 50)
        })
      }
    }

    // 格式化 YAML 内容（保留注释）
    const formatYAML = () => {
      if (!editorRef.current) return

      const currentValue = editorRef.current.getValue()
      if (!currentValue || currentValue.trim() === '') return

      try {
        // 使用 parseDocument 以保留注释
        const doc = YAML.parseDocument(currentValue)
        if (doc.contents === null) return

        // 转换为字符串（保留注释和格式）
        const formatted = doc.toString()

        // 更新编辑器内容
        isInternalUpdate.current = true
        editorRef.current.setValue(formatted)
        onChange(formatted)

        // 清除错误
        if (onParseError) {
          onParseError('')
        }
      } catch (error) {
        // 如果解析失败，显示错误
        if (onParseError) {
          onParseError(error instanceof Error ? error.message : 'YAML 解析错误')
        }
      }
    }

    // 定位到指定路径
    const locatePath = useCallback((path: string) => {
      if (!editorRef.current) return
      
      const lineNumber = getLineNumberFromPath(path)
      if (lineNumber !== null) {
        // 获取该行的内容
        const currentValue = editorRef.current.getValue()
        const lines = currentValue.split('\n')
        const lineContent = lines[lineNumber - 1] || ''
        
        // 计算该行的长度（定位到行末）
        const column = lineContent.length + 1
        
        // 定位到该行的末尾
        editorRef.current.setPosition({ lineNumber, column })
        editorRef.current.revealLineInCenter(lineNumber)
        editorRef.current.focus()
      }
    }, [getLineNumberFromPath])

    // 暴露格式化方法给父组件
    useImperativeHandle(ref, () => ({
      format: formatYAML,
      locatePath,
    }))

    const handleEditorChange: OnChange = (val: string | undefined) => {
      if (val === undefined) return

      isInternalUpdate.current = true
      onChange(val)

      // 验证 YAML 格式
      if (onParseError) {
        try {
          YAML.parseDocument(val)
          onParseError('')
        } catch (error) {
          onParseError(error instanceof Error ? error.message : 'YAML 解析错误')
        }
      }
    }

    // 当外部 value 变化时更新编辑器（避免循环更新）
    useEffect(() => {
      if (!isInternalUpdate.current && editorRef.current) {
        // 检查是否有活动的 input 元素（用户正在编辑表单）
        const activeElement = document.activeElement
        const isEditingForm = activeElement && activeElement.tagName === 'INPUT'
        
        // 如果用户正在编辑表单，不更新编辑器或延迟更新
        if (isEditingForm) {
          return
        }
        
        const editor = editorRef.current
        const currentValue = editor.getValue()
        if (currentValue !== value) {
          // 保存当前光标位置
          const position = editor.getPosition()
          editor.setValue(value)
          // 如果有保存的位置，恢复它；否则重置到开头
          if (position) {
            editor.setPosition(position)
          } else {
            editor.setPosition({ lineNumber: 1, column: 1 })
          }
        }
      }
      isInternalUpdate.current = false
    }, [value])

    return (
      <div className="yaml-editor">
        <Editor
          height="100%"
          defaultLanguage="yaml"
          value={value}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme={theme === 'dark' ? 'vs-dark' : 'vs'}
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            formatOnPaste: true,
            formatOnType: true,
          }}
        />
      </div>
    )
  }
)

YAMLEditor.displayName = 'YAMLEditor'

export default YAMLEditor

