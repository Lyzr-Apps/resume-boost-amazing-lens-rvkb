'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import type { AIAgentResponse } from '@/lib/aiAgent'
import parseLLMJson from '@/lib/jsonParser'
import { copyToClipboard } from '@/lib/clipboard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { FiSearch, FiEdit3, FiBarChart2, FiType, FiCpu, FiCopy, FiCheck, FiTrash2, FiLoader, FiAlertCircle, FiChevronDown, FiChevronUp, FiArrowRight } from 'react-icons/fi'

// --- Types ---
interface KeywordAlignment {
  matched_keywords: string[]
  missing_keywords: string[]
  suggestions: string[]
}

interface BulletImprovement {
  original: string
  improved: string
}

interface ImpactItem {
  achievement: string
  suggestion: string
}

interface ActionVerb {
  weak_verb: string
  stronger_verb: string
  context: string
}

interface IoTProject {
  title: string
  description: string
  estimated_time: string
  skills: string[]
  relevance: string
}

interface AgentResult {
  keyword_alignment?: KeywordAlignment
  bullet_improvements?: BulletImprovement[]
  impact_quantification?: ImpactItem[]
  action_verbs?: ActionVerb[]
  iot_projects?: IoTProject[]
}

// --- Constants ---
const AGENT_ID = '699964710fc64800c899bc30'

const LOADING_MESSAGES = [
  'Analyzing keyword alignment...',
  'Improving bullet points...',
  'Quantifying impact...',
  'Finding stronger action verbs...',
  'Generating IoT project suggestions...',
]

const SAMPLE_RESUME = `John Doe
Software Engineer

Summary:
Experienced software developer with 3 years of experience working on web applications and IoT projects. Familiar with JavaScript, Python, and C++. Worked on team projects and helped improve system performance.

Experience:
- Worked on the company website using React and Node.js
- Helped with database optimization tasks
- Was responsible for testing and fixing bugs
- Participated in code reviews and team meetings
- Managed deployment of applications to production servers

Education:
B.Tech in Computer Science, XYZ University, 2021

Skills:
JavaScript, Python, React, Node.js, MongoDB, Git, C++, Arduino, Raspberry Pi

Projects:
- Smart Home System: Built a home automation system using Arduino
- Weather Dashboard: Created a web app showing weather data`

const SAMPLE_JD = `Software Engineer - IoT & Embedded Systems

We are looking for a talented Software Engineer to join our IoT team. The ideal candidate will have experience with:

Requirements:
- Strong proficiency in Python, C/C++, and JavaScript
- Experience with IoT protocols (MQTT, CoAP, HTTP)
- Familiarity with embedded systems and microcontrollers (ESP32, STM32)
- Experience with cloud platforms (AWS IoT, Azure IoT Hub)
- Knowledge of real-time data processing and edge computing
- Experience with CI/CD pipelines and DevOps practices
- Strong understanding of RESTful APIs and microservices architecture
- Excellent problem-solving and communication skills

Nice to have:
- Experience with TensorFlow Lite or Edge AI
- Knowledge of RTOS (FreeRTOS)
- Familiarity with PCB design
- Published IoT projects or open-source contributions

Responsibilities:
- Design and develop IoT solutions for industrial applications
- Optimize firmware for resource-constrained devices
- Implement secure communication protocols
- Collaborate with cross-functional teams
- Mentor junior developers`

const SAMPLE_RESULTS: AgentResult = {
  keyword_alignment: {
    matched_keywords: ['Python', 'JavaScript', 'C++', 'React', 'Node.js', 'Arduino', 'IoT', 'Git'],
    missing_keywords: ['MQTT', 'CoAP', 'ESP32', 'STM32', 'AWS IoT', 'Azure IoT Hub', 'edge computing', 'CI/CD', 'microservices', 'TensorFlow Lite', 'RTOS', 'FreeRTOS'],
    suggestions: [
      'Add MQTT and CoAP protocol experience if you have worked with any messaging protocols in IoT projects.',
      'Mention specific cloud platforms (AWS IoT, Azure IoT) even if exposure was limited.',
      'Include CI/CD tools you have used (Jenkins, GitHub Actions, GitLab CI).',
      'Reference microservices architecture if your Node.js work involved service-oriented design.',
      'Add edge computing concepts if your Arduino/Raspberry Pi projects processed data locally.',
    ],
  },
  bullet_improvements: [
    {
      original: 'Worked on the company website using React and Node.js',
      improved: 'Architected and developed a full-stack web application using React and Node.js, serving 10,000+ daily active users with 99.9% uptime',
    },
    {
      original: 'Helped with database optimization tasks',
      improved: 'Optimized MongoDB query performance by implementing indexing strategies and aggregation pipelines, reducing average response time by 40%',
    },
    {
      original: 'Was responsible for testing and fixing bugs',
      improved: 'Spearheaded quality assurance initiatives by implementing automated testing suites (Jest, Cypress), reducing production bugs by 60%',
    },
    {
      original: 'Participated in code reviews and team meetings',
      improved: 'Led bi-weekly code review sessions for a team of 8 engineers, establishing coding standards that improved code maintainability by 35%',
    },
    {
      original: 'Managed deployment of applications to production servers',
      improved: 'Engineered CI/CD pipelines using GitHub Actions for automated deployment to AWS, reducing release cycles from 2 weeks to 2 days',
    },
  ],
  impact_quantification: [
    {
      achievement: 'Smart Home System using Arduino',
      suggestion: 'Quantify: "Engineered a smart home automation system integrating 12 IoT sensors via MQTT protocol, achieving <200ms response latency and supporting 50+ concurrent device connections"',
    },
    {
      achievement: 'Weather Dashboard web app',
      suggestion: 'Quantify: "Developed a real-time weather monitoring dashboard processing 5,000+ API calls daily, with data visualization for 15 weather parameters across 100+ locations"',
    },
    {
      achievement: 'System performance improvement',
      suggestion: 'Quantify: "Improved system performance by X% through specific optimization technique, resulting in $Y cost savings or Z% faster processing"',
    },
  ],
  action_verbs: [
    { weak_verb: 'Worked on', stronger_verb: 'Architected', context: 'Use when describing system design and development of the company website' },
    { weak_verb: 'Helped with', stronger_verb: 'Optimized', context: 'Use when describing database performance improvements' },
    { weak_verb: 'Was responsible for', stronger_verb: 'Spearheaded', context: 'Use when describing testing and quality assurance leadership' },
    { weak_verb: 'Participated in', stronger_verb: 'Led', context: 'Use when describing code reviews if you drove the process forward' },
    { weak_verb: 'Managed', stronger_verb: 'Engineered', context: 'Use when describing deployment pipeline creation and management' },
    { weak_verb: 'Built', stronger_verb: 'Pioneered', context: 'Use when describing the IoT home automation project from scratch' },
    { weak_verb: 'Created', stronger_verb: 'Developed', context: 'Use for the weather dashboard, implies more technical depth' },
  ],
  iot_projects: [
    {
      title: 'Industrial Predictive Maintenance Monitor',
      description: 'Build a vibration and temperature monitoring system for industrial equipment using ESP32 microcontrollers. Implement edge computing for anomaly detection and stream processed data to AWS IoT Core via MQTT. Create a real-time dashboard for maintenance alerts.',
      estimated_time: '4-6 weeks',
      skills: ['ESP32', 'MQTT', 'AWS IoT Core', 'Python', 'Edge Computing', 'TensorFlow Lite'],
      relevance: 'Directly addresses the JD requirements for IoT protocols, cloud platforms, edge computing, and embedded systems experience.',
    },
    {
      title: 'Smart Agriculture Sensor Network',
      description: 'Design a mesh network of soil moisture, pH, and weather sensors using STM32 microcontrollers running FreeRTOS. Implement CoAP for resource-constrained communication and deploy data processing on Azure IoT Hub.',
      estimated_time: '6-8 weeks',
      skills: ['STM32', 'FreeRTOS', 'CoAP', 'Azure IoT Hub', 'C/C++', 'Microservices'],
      relevance: 'Covers RTOS, embedded systems, CoAP protocol, and cloud platform requirements from the job description.',
    },
    {
      title: 'Connected Fleet Tracking System',
      description: 'Develop a GPS-based fleet tracking solution with real-time location streaming over MQTT. Implement geofencing logic on edge devices and build RESTful APIs for fleet management operations.',
      estimated_time: '3-4 weeks',
      skills: ['MQTT', 'RESTful APIs', 'Python', 'CI/CD', 'Docker', 'GPS/GNSS'],
      relevance: 'Demonstrates real-time data processing, API design, and DevOps skills mentioned in the requirements.',
    },
  ],
}

// --- ErrorBoundary ---
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// --- Markdown Renderer ---
function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-semibold text-sm mt-3 mb-1">
              {line.slice(4)}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-semibold text-base mt-3 mb-1">
              {line.slice(3)}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-bold text-lg mt-4 mb-2">
              {line.slice(2)}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm">
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm">
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm">
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

// --- Tab Config ---
const TAB_CONFIG = [
  { id: 'keywords', label: 'Keywords', icon: FiSearch },
  { id: 'bullets', label: 'Bullets', icon: FiEdit3 },
  { id: 'impact', label: 'Impact', icon: FiBarChart2 },
  { id: 'verbs', label: 'Verbs', icon: FiType },
  { id: 'projects', label: 'Projects', icon: FiCpu },
] as const

// --- Sub-components ---

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [text])

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      title={label ?? 'Copy to clipboard'}
    >
      {copied ? (
        <>
          <FiCheck className="h-3.5 w-3.5 text-green-600" />
          <span className="text-green-600">Copied!</span>
        </>
      ) : (
        <>
          <FiCopy className="h-3.5 w-3.5" />
          {label && <span>{label}</span>}
        </>
      )}
    </button>
  )
}

function KeywordsTab({ data }: { data?: KeywordAlignment }) {
  const matched = Array.isArray(data?.matched_keywords) ? data.matched_keywords : []
  const missing = Array.isArray(data?.missing_keywords) ? data.missing_keywords : []
  const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : []

  const fullText = [
    'MATCHED KEYWORDS:',
    matched.join(', '),
    '',
    'MISSING KEYWORDS:',
    missing.join(', '),
    '',
    'SUGGESTIONS:',
    ...suggestions.map((s, i) => `${i + 1}. ${s}`),
  ].join('\n')

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-bold tracking-tight">Keyword Analysis</h3>
        <CopyButton text={fullText} label="Copy All" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Matched Keywords</CardTitle>
            <CardDescription className="text-xs">{matched.length} keywords found in your resume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {matched.length > 0 ? (
                matched.map((kw, i) => (
                  <Badge key={i} className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">{kw}</Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No matched keywords found.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Missing Keywords</CardTitle>
            <CardDescription className="text-xs">{missing.length} keywords to add to your resume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {missing.length > 0 ? (
                missing.map((kw, i) => (
                  <Badge key={i} className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">{kw}</Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No missing keywords.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {suggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
                  <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-secondary text-secondary-foreground text-xs font-medium mt-0.5">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function BulletsTab({ data }: { data?: BulletImprovement[] }) {
  const items = Array.isArray(data) ? data : []

  const fullText = items
    .map((item, i) => `${i + 1}. Original: ${item.original}\n   Improved: ${item.improved}`)
    .join('\n\n')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-bold tracking-tight">Bullet Point Improvements</h3>
        <CopyButton text={fullText} label="Copy All" />
      </div>

      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item, i) => (
            <Card key={i}>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
                  <div className="p-5 bg-muted/40">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Original</span>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{item?.original ?? ''}</p>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-foreground">Improved</span>
                      <CopyButton text={item?.improved ?? ''} />
                    </div>
                    <p className="text-sm leading-relaxed font-medium">{item?.improved ?? ''}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No bullet improvements available.</p>
      )}
    </div>
  )
}

function ImpactTab({ data }: { data?: ImpactItem[] }) {
  const items = Array.isArray(data) ? data : []

  const fullText = items
    .map((item, i) => `${i + 1}. Achievement: ${item.achievement}\n   Suggestion: ${item.suggestion}`)
    .join('\n\n')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-bold tracking-tight">Impact Quantification</h3>
        <CopyButton text={fullText} label="Copy All" />
      </div>

      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item, i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FiBarChart2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Achievement</span>
                    </div>
                    <p className="text-sm font-medium">{item?.achievement ?? ''}</p>
                  </div>
                  <CopyButton text={item?.suggestion ?? ''} />
                </div>
                <Separator />
                <div>
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Suggestion</span>
                  <p className="text-sm leading-relaxed mt-1">{item?.suggestion ?? ''}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No impact quantification suggestions available.</p>
      )}
    </div>
  )
}

function VerbsTab({ data }: { data?: ActionVerb[] }) {
  const items = Array.isArray(data) ? data : []

  const fullText = items
    .map((item) => `${item.weak_verb} -> ${item.stronger_verb} (${item.context})`)
    .join('\n')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-bold tracking-tight">Action Verb Upgrades</h3>
        <CopyButton text={fullText} label="Copy All" />
      </div>

      {items.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left p-4 font-medium uppercase tracking-wide text-xs text-muted-foreground">Weak Verb</th>
                    <th className="text-center p-4 w-12"></th>
                    <th className="text-left p-4 font-medium uppercase tracking-wide text-xs text-muted-foreground">Stronger Verb</th>
                    <th className="text-left p-4 font-medium uppercase tracking-wide text-xs text-muted-foreground">Context</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-b last:border-b-0">
                      <td className="p-4 text-muted-foreground line-through">{item?.weak_verb ?? ''}</td>
                      <td className="p-4 text-center">
                        <FiArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                      </td>
                      <td className="p-4 font-semibold">{item?.stronger_verb ?? ''}</td>
                      <td className="p-4 text-muted-foreground text-xs leading-relaxed">{item?.context ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">No action verb suggestions available.</p>
      )}
    </div>
  )
}

function ProjectsTab({ data }: { data?: IoTProject[] }) {
  const items = Array.isArray(data) ? data : []
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const fullText = items
    .map((item) => `${item.title}\n${item.description}\nTime: ${item.estimated_time}\nSkills: ${Array.isArray(item.skills) ? item.skills.join(', ') : ''}\nRelevance: ${item.relevance}`)
    .join('\n\n---\n\n')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-bold tracking-tight">IoT Project Suggestions</h3>
        <CopyButton text={fullText} label="Copy All" />
      </div>

      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item, i) => {
            const isExpanded = expandedIdx === i
            const skills = Array.isArray(item?.skills) ? item.skills : []
            return (
              <Card key={i}>
                <CardContent className="p-0">
                  <button
                    onClick={() => setExpandedIdx(isExpanded ? null : i)}
                    className="w-full text-left p-5 flex items-start justify-between gap-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <FiCpu className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <h4 className="font-semibold text-sm">{item?.title ?? 'Untitled Project'}</h4>
                      </div>
                      <div className="flex items-center gap-3 ml-7 text-xs text-muted-foreground">
                        <span>{item?.estimated_time ?? 'N/A'}</span>
                        <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                        <span>{skills.length} skills</span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <FiChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    ) : (
                      <FiChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 space-y-4 border-t">
                      <div className="pt-4">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</span>
                        <p className="text-sm leading-relaxed mt-1">{item?.description ?? ''}</p>
                      </div>

                      <div>
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Skills</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {skills.map((skill, si) => (
                            <Badge key={si} variant="secondary">{skill}</Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Relevance to Job</span>
                        <p className="text-sm leading-relaxed mt-1 text-muted-foreground">{item?.relevance ?? ''}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No project suggestions available.</p>
      )}
    </div>
  )
}

function LoadingState() {
  const [messageIdx, setMessageIdx] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIdx((prev) => (prev + 1) % LOADING_MESSAGES.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 justify-center py-4">
        <FiLoader className="h-5 w-5 animate-spin text-foreground" />
        <p className="text-sm font-medium">{LOADING_MESSAGES[messageIdx]}</p>
      </div>

      <div className="space-y-4">
        {[1, 2, 3].map((n) => (
          <Card key={n}>
            <CardContent className="p-5 space-y-3">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function AgentStatusBar({ isActive }: { isActive: boolean }) {
  return (
    <Card className="mt-8">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Agent</div>
            <Separator orientation="vertical" className="h-4" />
            <div className="text-sm font-medium">Resume Optimization Agent</div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
            <span className="text-xs text-muted-foreground">{isActive ? 'Processing' : 'Ready'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Main Page ---
export default function Page() {
  const [resumeText, setResumeText] = useState('')
  const [jdText, setJdText] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<AgentResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('keywords')
  const [sampleMode, setSampleMode] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  const displayResults = sampleMode && !results ? SAMPLE_RESULTS : results
  const displayResume = sampleMode && !resumeText ? SAMPLE_RESUME : resumeText
  const displayJd = sampleMode && !jdText ? SAMPLE_JD : jdText

  const handleOptimize = useCallback(async () => {
    const resume = resumeText || (sampleMode ? SAMPLE_RESUME : '')
    const jd = jdText || (sampleMode ? SAMPLE_JD : '')

    if (!resume.trim() || !jd.trim()) return

    setLoading(true)
    setError(null)
    setResults(null)
    setActiveAgentId(AGENT_ID)

    try {
      const message = `Resume:\n${resume}\n\nJob Description:\n${jd}`
      const result: AIAgentResponse = await callAIAgent(message, AGENT_ID)

      if (result.success) {
        const rawResult = result?.response?.result
        let parsed = rawResult

        if (typeof rawResult === 'string') {
          parsed = parseLLMJson(rawResult)
        } else if (rawResult && typeof rawResult === 'object') {
          // Check if the data is nested under common keys
          if (rawResult?.keyword_alignment || rawResult?.bullet_improvements) {
            parsed = rawResult
          } else {
            parsed = parseLLMJson(rawResult)
          }
        }

        if (parsed && typeof parsed === 'object' && !parsed?.error) {
          setResults(parsed as AgentResult)
          setActiveTab('keywords')
        } else {
          setError('Could not parse the agent response. Please try again.')
        }
      } else {
        setError(result?.error ?? result?.response?.message ?? 'An error occurred while processing your request.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setLoading(false)
      setActiveAgentId(null)
    }
  }, [resumeText, jdText, sampleMode])

  const handleClear = useCallback(() => {
    setResumeText('')
    setJdText('')
    setResults(null)
    setError(null)
    setActiveTab('keywords')
  }, [])

  const canOptimize = (resumeText.trim().length > 0 || (sampleMode && SAMPLE_RESUME.length > 0)) && (jdText.trim().length > 0 || (sampleMode && SAMPLE_JD.length > 0))

  const generateFullReport = useCallback(() => {
    const data = displayResults
    if (!data) return ''
    const sections: string[] = []

    sections.push('=== RESUME OPTIMIZATION REPORT ===\n')

    const matched = Array.isArray(data?.keyword_alignment?.matched_keywords) ? data.keyword_alignment.matched_keywords : []
    const missing = Array.isArray(data?.keyword_alignment?.missing_keywords) ? data.keyword_alignment.missing_keywords : []
    const suggestions = Array.isArray(data?.keyword_alignment?.suggestions) ? data.keyword_alignment.suggestions : []

    sections.push('--- KEYWORD ALIGNMENT ---')
    sections.push(`Matched: ${matched.join(', ')}`)
    sections.push(`Missing: ${missing.join(', ')}`)
    sections.push('Suggestions:')
    suggestions.forEach((s, i) => sections.push(`  ${i + 1}. ${s}`))
    sections.push('')

    const bullets = Array.isArray(data?.bullet_improvements) ? data.bullet_improvements : []
    sections.push('--- BULLET IMPROVEMENTS ---')
    bullets.forEach((b, i) => {
      sections.push(`  ${i + 1}. Original: ${b?.original ?? ''}`)
      sections.push(`     Improved: ${b?.improved ?? ''}`)
    })
    sections.push('')

    const impacts = Array.isArray(data?.impact_quantification) ? data.impact_quantification : []
    sections.push('--- IMPACT QUANTIFICATION ---')
    impacts.forEach((item, i) => {
      sections.push(`  ${i + 1}. ${item?.achievement ?? ''}`)
      sections.push(`     ${item?.suggestion ?? ''}`)
    })
    sections.push('')

    const verbs = Array.isArray(data?.action_verbs) ? data.action_verbs : []
    sections.push('--- ACTION VERBS ---')
    verbs.forEach((v) => {
      sections.push(`  ${v?.weak_verb ?? ''} -> ${v?.stronger_verb ?? ''} (${v?.context ?? ''})`)
    })
    sections.push('')

    const projects = Array.isArray(data?.iot_projects) ? data.iot_projects : []
    sections.push('--- IOT PROJECTS ---')
    projects.forEach((p, i) => {
      sections.push(`  ${i + 1}. ${p?.title ?? ''}`)
      sections.push(`     ${p?.description ?? ''}`)
      sections.push(`     Time: ${p?.estimated_time ?? ''}`)
      sections.push(`     Skills: ${Array.isArray(p?.skills) ? p.skills.join(', ') : ''}`)
      sections.push(`     Relevance: ${p?.relevance ?? ''}`)
    })

    return sections.join('\n')
  }, [displayResults])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background border-b">
          <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
            <div>
              <h1 className="font-serif text-2xl font-bold tracking-tight" style={{ letterSpacing: '-0.02em' }}>ResumeEdge</h1>
              <p className="text-sm text-muted-foreground mt-0.5 font-sans">Optimize your resume for campus placements</p>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer">Sample Data</Label>
              <Switch
                id="sample-toggle"
                checked={sampleMode}
                onCheckedChange={setSampleMode}
              />
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8" style={{ lineHeight: '1.7' }}>
          {/* Input Section */}
          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Resume Input */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Resume</CardTitle>
                    <Badge variant="outline" className="text-xs font-mono">{(displayResume).length} chars</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Paste your resume content here..."
                    className="min-h-[300px] resize-y text-sm leading-relaxed font-sans"
                    value={sampleMode && !resumeText ? SAMPLE_RESUME : resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                  />
                </CardContent>
              </Card>

              {/* JD Input */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Job Description</CardTitle>
                    <Badge variant="outline" className="text-xs font-mono">{(displayJd).length} chars</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Paste the target job description here..."
                    className="min-h-[300px] resize-y text-sm leading-relaxed font-sans"
                    value={sampleMode && !jdText ? SAMPLE_JD : jdText}
                    onChange={(e) => setJdText(e.target.value)}
                  />
                </CardContent>
              </Card>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button
                onClick={handleOptimize}
                disabled={loading || !canOptimize}
                className="px-8 py-3 text-sm font-medium tracking-wide"
                size="lg"
              >
                {loading ? (
                  <>
                    <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  'Optimize My Resume'
                )}
              </Button>

              {(resumeText || jdText || results) && (
                <Button
                  onClick={handleClear}
                  variant="outline"
                  size="lg"
                  className="px-6 py-3 text-sm"
                >
                  <FiTrash2 className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </section>

          {/* Error State */}
          {error && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <FiAlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">Optimization Failed</p>
                    <p className="text-sm text-muted-foreground mt-1">{error}</p>
                  </div>
                  <Button
                    onClick={handleOptimize}
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0"
                    disabled={loading}
                  >
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Section */}
          {loading ? (
            <section>
              <LoadingState />
            </section>
          ) : displayResults ? (
            <section className="space-y-6">
              <Separator />

              <div className="flex items-center justify-between">
                <h2 className="font-serif text-xl font-bold tracking-tight" style={{ letterSpacing: '-0.02em' }}>Optimization Results</h2>
                <CopyButton text={generateFullReport()} label="Copy Full Report" />
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0 gap-0">
                  {TAB_CONFIG.map((tab) => {
                    const IconComp = tab.icon
                    return (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm gap-2"
                      >
                        <IconComp className="h-4 w-4" />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </TabsTrigger>
                    )
                  })}
                </TabsList>

                <div className="mt-6">
                  <TabsContent value="keywords">
                    <KeywordsTab data={displayResults?.keyword_alignment} />
                  </TabsContent>

                  <TabsContent value="bullets">
                    <BulletsTab data={displayResults?.bullet_improvements} />
                  </TabsContent>

                  <TabsContent value="impact">
                    <ImpactTab data={displayResults?.impact_quantification} />
                  </TabsContent>

                  <TabsContent value="verbs">
                    <VerbsTab data={displayResults?.action_verbs} />
                  </TabsContent>

                  <TabsContent value="projects">
                    <ProjectsTab data={displayResults?.iot_projects} />
                  </TabsContent>
                </div>
              </Tabs>
            </section>
          ) : (
            <section>
              <Card className="border-dashed">
                <CardContent className="py-16">
                  <div className="text-center">
                    <FiEdit3 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
                    <p className="text-base font-medium text-muted-foreground">Paste your resume and a job description to get started</p>
                    <p className="text-sm text-muted-foreground/70 mt-2">Our AI agent will analyze keyword alignment, improve bullet points, and suggest impactful changes</p>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Agent Status */}
          <AgentStatusBar isActive={activeAgentId !== null} />
        </main>
      </div>
    </ErrorBoundary>
  )
}
