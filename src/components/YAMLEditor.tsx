import { useRef, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import * as yaml from 'js-yaml'
import type { OnChange, OnMount } from '@monaco-editor/react'
import './YAMLEditor.css'

interface YAMLEditorProps {
  value: string
  onChange: (value: string) => void
  onParseError?: (error: string) => void
}

export default function YAMLEditor({ value, onChange, onParseError }: YAMLEditorProps) {
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
      const editor = editorRef.current
      const currentValue = editor.getValue()
      if (currentValue !== value) {
        editor.setValue(value)
        // 重置光标位置到开头
        editor.setPosition({ lineNumber: 1, column: 1 })
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
        theme="vs"
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

