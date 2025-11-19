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

