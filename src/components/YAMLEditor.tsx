import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import Editor from '@monaco-editor/react'
import * as yaml from 'js-yaml'
import type { OnChange, OnMount } from '@monaco-editor/react'
import './YAMLEditor.css'

interface YAMLEditorProps {
  value: string
  onChange: (value: string) => void
  onParseError?: (error: string) => void
  theme?: 'light' | 'dark'
}

export interface YAMLEditorHandle {
  format: () => void
}

const YAMLEditor = forwardRef<YAMLEditorHandle, YAMLEditorProps>(
  ({ value, onChange, onParseError, theme = 'light' }, ref) => {
    const editorRef = useRef<any>(null)
    const isInternalUpdate = useRef(false)

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
    }

    // 格式化 YAML 内容
    const formatYAML = () => {
      if (!editorRef.current) return

      const currentValue = editorRef.current.getValue()
      if (!currentValue || currentValue.trim() === '') return

      try {
        // 解析 YAML
        const parsed = yaml.load(currentValue)
        if (parsed === undefined) return

        // 重新格式化为标准 YAML
        const formatted = yaml.dump(parsed, {
          indent: 2,
          lineWidth: -1,
          quotingType: '"',
          forceQuotes: false,
          noRefs: true,
          sortKeys: false,
        })

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

    // 暴露格式化方法给父组件
    useImperativeHandle(ref, () => ({
      format: formatYAML,
    }))

    const handleEditorChange: OnChange = (val: string | undefined) => {
      if (val === undefined) return

      isInternalUpdate.current = true
      onChange(val)

      // 验证 YAML 格式
      if (onParseError) {
        try {
          yaml.load(val)
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

