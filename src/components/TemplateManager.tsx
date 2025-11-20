import { useState, useCallback, useEffect, useRef } from 'react'
import { CloseIcon, DeleteIcon, PlusIcon, ChevronDownIcon } from './Icons'
import './TemplateManager.css'

export interface Template {
  id: string
  name: string
  description?: string
  data: any
  isPreset?: boolean
  createdAt?: number
}

// 预设模板
const PRESET_TEMPLATES: Template[] = [
  {
    id: 'docker-compose',
    name: 'Docker Compose',
    description: 'Docker Compose 配置文件模板',
    isPreset: true,
    data: {
      version: '3.8',
      services: {
        web: {
          image: 'nginx:latest',
          ports: ['80:80'],
          volumes: ['./:/usr/share/nginx/html'],
          environment: {
            NODE_ENV: 'production'
          }
        },
        db: {
          image: 'postgres:13',
          environment: {
            POSTGRES_DB: 'mydb',
            POSTGRES_USER: 'user',
            POSTGRES_PASSWORD: 'password'
          },
          volumes: ['postgres_data:/var/lib/postgresql/data']
        }
      },
      volumes: {
        postgres_data: {}
      }
    }
  },
  {
    id: 'kubernetes-deployment',
    name: 'Kubernetes Deployment',
    description: 'Kubernetes Deployment 配置模板',
    isPreset: true,
    data: {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: 'my-app',
        labels: {
          app: 'my-app'
        }
      },
      spec: {
        replicas: 3,
        selector: {
          matchLabels: {
            app: 'my-app'
          }
        },
        template: {
          metadata: {
            labels: {
              app: 'my-app'
            }
          },
          spec: {
            containers: [
              {
                name: 'my-app',
                image: 'my-app:1.0.0',
                ports: [
                  {
                    containerPort: 8080
                  }
                ],
                env: [
                  {
                    name: 'ENV',
                    value: 'production'
                  }
                ],
                resources: {
                  requests: {
                    memory: '128Mi',
                    cpu: '100m'
                  },
                  limits: {
                    memory: '256Mi',
                    cpu: '200m'
                  }
                }
              }
            ]
          }
        }
      }
    }
  },
  {
    id: 'kubernetes-service',
    name: 'Kubernetes Service',
    description: 'Kubernetes Service 配置模板',
    isPreset: true,
    data: {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: 'my-app-service',
        labels: {
          app: 'my-app'
        }
      },
      spec: {
        type: 'LoadBalancer',
        ports: [
          {
            port: 80,
            targetPort: 8080,
            protocol: 'TCP'
          }
        ],
        selector: {
          app: 'my-app'
        }
      }
    }
  },
  {
    id: 'github-actions',
    name: 'GitHub Actions',
    description: 'GitHub Actions 工作流模板',
    isPreset: true,
    data: {
      name: 'CI/CD Pipeline',
      on: {
        push: {
          branches: ['main', 'develop']
        },
        pull_request: {
          branches: ['main']
        }
      },
      jobs: {
        build: {
          'runs-on': 'ubuntu-latest',
          steps: [
            {
              name: 'Checkout code',
              uses: 'actions/checkout@v3'
            },
            {
              name: 'Setup Node.js',
              uses: 'actions/setup-node@v3',
              with: {
                'node-version': '18'
              }
            },
            {
              name: 'Install dependencies',
              run: 'npm ci'
            },
            {
              name: 'Run tests',
              run: 'npm test'
            },
            {
              name: 'Build',
              run: 'npm run build'
            }
          ]
        }
      }
    }
  },
  {
    id: 'traefik',
    name: 'Traefik',
    description: 'Traefik 反向代理配置模板',
    isPreset: true,
    data: {
      api: {
        dashboard: true
      },
      entryPoints: {
        web: {
          address: ':80'
        },
        websecure: {
          address: ':443'
        }
      },
      providers: {
        docker: {
          endpoint: 'unix:///var/run/docker.sock',
          exposedByDefault: false
        },
        file: {
          filename: '/etc/traefik/traefik.yml',
          watch: true
        }
      },
      certificatesResolvers: {
        letsencrypt: {
          acme: {
            email: 'your-email@example.com',
            storage: '/letsencrypt/acme.json',
            httpChallenge: {
              entryPoint: 'web'
            }
          }
        }
      }
    }
  }
]

const STORAGE_KEY = 'yameilo-templates'

interface TemplateManagerProps {
  currentData: any
  onApplyTemplate: (data: any) => void
  onSaveAsTemplate?: (name: string, description: string, data: any) => void
}

export default function TemplateManager({ currentData, onApplyTemplate, onSaveAsTemplate }: TemplateManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [userTemplates, setUserTemplates] = useState<Template[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const saveDialogRef = useRef<HTMLDivElement>(null)

  // 从 localStorage 加载用户模板
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const templates = JSON.parse(saved) as Template[]
        setUserTemplates(templates)
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
  }, [])

  // 保存模板到 localStorage
  const saveTemplates = useCallback((templates: Template[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
      setUserTemplates(templates)
    } catch (error) {
      console.error('Failed to save templates:', error)
      alert('保存模板失败，可能是存储空间不足')
    }
  }, [])

  // 应用模板
  const handleApplyTemplate = useCallback((template: Template) => {
    if (confirm('应用模板将替换当前配置，是否继续？')) {
      onApplyTemplate(template.data)
      setIsOpen(false)
    }
  }, [onApplyTemplate])

  // 保存当前配置为模板
  const handleSaveTemplate = useCallback(() => {
    if (!templateName.trim()) {
      alert('请输入模板名称')
      return
    }

    const newTemplate: Template = {
      id: `user-${Date.now()}`,
      name: templateName.trim(),
      description: templateDescription.trim() || undefined,
      data: currentData,
      isPreset: false,
      createdAt: Date.now()
    }

    const updatedTemplates = [...userTemplates, newTemplate]
    saveTemplates(updatedTemplates)
    
    setTemplateName('')
    setTemplateDescription('')
    setShowSaveDialog(false)
    alert('模板保存成功！')
  }, [templateName, templateDescription, currentData, userTemplates, saveTemplates])

  // 删除模板
  const handleDeleteTemplate = useCallback((templateId: string) => {
    const updatedTemplates = userTemplates.filter(t => t.id !== templateId)
    saveTemplates(updatedTemplates)
    setShowDeleteConfirm(null)
  }, [userTemplates, saveTemplates])

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
      if (saveDialogRef.current && !saveDialogRef.current.contains(event.target as Node)) {
        // 不关闭保存对话框，需要用户主动关闭
      }
    }

    if (isOpen || showSaveDialog) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, showSaveDialog])

  const allTemplates = [...PRESET_TEMPLATES, ...userTemplates]

  return (
    <>
      <div className="template-menu-container" ref={menuRef}>
        <button
          className="btn btn-secondary"
          onClick={() => setIsOpen(!isOpen)}
          title="模板管理"
        >
          <PlusIcon size={14} />
          <span>模板</span>
          <ChevronDownIcon size={12} />
        </button>
        {isOpen && (
          <div className="template-menu">
            <div className="template-menu-header">
              <span className="template-menu-title">配置模板</span>
              <button
                className="template-menu-close"
                onClick={() => setIsOpen(false)}
                title="关闭"
              >
                <CloseIcon size={14} />
              </button>
            </div>
            
            <div className="template-menu-content">
              {/* 保存当前配置为模板 */}
              {onSaveAsTemplate && (
                <div className="template-section">
                  <button
                    className="template-save-btn"
                    onClick={() => setShowSaveDialog(true)}
                  >
                    <PlusIcon size={14} />
                    <span>保存当前配置为模板</span>
                  </button>
                </div>
              )}

              {/* 预设模板 */}
              {PRESET_TEMPLATES.length > 0 && (
                <div className="template-section">
                  <div className="template-section-title">预设模板</div>
                  {PRESET_TEMPLATES.map(template => (
                    <div key={template.id} className="template-item">
                      <div className="template-item-info">
                        <div className="template-item-name">{template.name}</div>
                        {template.description && (
                          <div className="template-item-desc">{template.description}</div>
                        )}
                      </div>
                      <button
                        className="template-item-apply"
                        onClick={() => handleApplyTemplate(template)}
                        title="应用模板"
                      >
                        应用
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 用户模板 */}
              {userTemplates.length > 0 && (
                <div className="template-section">
                  <div className="template-section-title">我的模板</div>
                  {userTemplates.map(template => (
                    <div key={template.id} className="template-item">
                      <div className="template-item-info">
                        <div className="template-item-name">{template.name}</div>
                        {template.description && (
                          <div className="template-item-desc">{template.description}</div>
                        )}
                        {template.createdAt && (
                          <div className="template-item-date">
                            {new Date(template.createdAt).toLocaleDateString('zh-CN')}
                          </div>
                        )}
                      </div>
                      <div className="template-item-actions">
                        <button
                          className="template-item-apply"
                          onClick={() => handleApplyTemplate(template)}
                          title="应用模板"
                        >
                          应用
                        </button>
                        {showDeleteConfirm === template.id ? (
                          <div className="template-delete-confirm">
                            <button
                              className="template-delete-yes"
                              onClick={() => handleDeleteTemplate(template.id)}
                            >
                              确认
                            </button>
                            <button
                              className="template-delete-no"
                              onClick={() => setShowDeleteConfirm(null)}
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <button
                            className="template-item-delete"
                            onClick={() => setShowDeleteConfirm(template.id)}
                            title="删除模板"
                          >
                            <DeleteIcon size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {allTemplates.length === 0 && (
                <div className="template-empty">
                  暂无模板，可以保存当前配置为模板
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 保存模板对话框 */}
      {showSaveDialog && (
        <div className="template-save-dialog-overlay">
          <div className="template-save-dialog" ref={saveDialogRef}>
            <div className="template-save-dialog-header">
              <span className="template-save-dialog-title">保存为模板</span>
              <button
                className="template-save-dialog-close"
                onClick={() => {
                  setShowSaveDialog(false)
                  setTemplateName('')
                  setTemplateDescription('')
                }}
              >
                <CloseIcon size={16} />
              </button>
            </div>
            <div className="template-save-dialog-content">
              <div className="template-save-field">
                <label>模板名称 *</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="输入模板名称"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && templateName.trim()) {
                      handleSaveTemplate()
                    }
                  }}
                />
              </div>
              <div className="template-save-field">
                <label>描述（可选）</label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="输入模板描述"
                  rows={3}
                />
              </div>
            </div>
            <div className="template-save-dialog-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowSaveDialog(false)
                  setTemplateName('')
                  setTemplateDescription('')
                }}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveTemplate}
                disabled={!templateName.trim()}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

