import { useState } from 'react'
import YAMLVisualizer from './components/YAMLVisualizer'
import './App.css'

function App() {
  const [yamlData, setYamlData] = useState<any>({})
  const [fileName, setFileName] = useState<string>('')

  const handleFileLoad = (data: any, name: string) => {
    setYamlData(data)
    setFileName(name)
  }

  const handleDataChange = (data: any) => {
    setYamlData(data)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>YAML 可视化工具</h1>
        <p>编辑 YAML 配置，支持表单和文本两种编辑方式</p>
      </header>
      <main className="app-main">
        <YAMLVisualizer
          data={yamlData}
          fileName={fileName}
          onDataChange={handleDataChange}
          onFileLoad={handleFileLoad}
          onReset={() => {
            setYamlData({})
            setFileName('')
          }}
        />
      </main>
    </div>
  )
}

export default App

