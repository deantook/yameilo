import { useRef } from 'react'
import * as yaml from 'js-yaml'
import { UploadIcon } from './Icons'
import './FileUploader.css'

interface FileUploaderProps {
  onFileLoad: (data: any, fileName: string) => void
}

export default function FileUploader({ onFileLoad }: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = yaml.load(text)
      onFileLoad(data, file.name)
    } catch (error) {
      alert(`解析 YAML 文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (!file || !file.name.endsWith('.yaml') && !file.name.endsWith('.yml')) {
      alert('请上传 YAML 文件 (.yaml 或 .yml)')
      return
    }

    try {
      const text = await file.text()
      const data = yaml.load(text)
      onFileLoad(data, file.name)
    } catch (error) {
      alert(`解析 YAML 文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  return (
    <div
      className="file-uploader"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".yaml,.yml"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <div className="upload-area">
        <UploadIcon size={48} />
        <h2>点击或拖拽上传 YAML 文件</h2>
        <p>支持 .yaml 和 .yml 格式</p>
      </div>
    </div>
  )
}

