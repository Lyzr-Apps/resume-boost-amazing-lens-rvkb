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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  FiCalendar, FiClock, FiMap, FiTarget, FiTrendingUp, FiZap, FiFileText,
  FiCopy, FiCheck, FiTrash2, FiLoader, FiAlertCircle, FiChevronDown,
  FiChevronUp, FiBookOpen, FiActivity, FiCpu, FiUsers,
  FiBarChart2, FiSend
} from 'react-icons/fi'

// --- Types ---
interface Deadline {
  exam: string
  date: string
  days_remaining: number
  urgency: string
}

interface TimelineAnalysis {
  upcoming_deadlines: Deadline[]
  priority_order: string[]
}

interface ScheduleBlock {
  time: string
  subject: string
  topic: string
  type: string
  difficulty: string
}

interface DaySchedule {
  day: string
  blocks: ScheduleBlock[]
}

interface WeekInfo {
  week: number
  focus_areas: string[]
  milestones: string[]
}

interface MonthRoadmap {
  month: string
  weeks: WeekInfo[]
}

interface PriorityTask {
  task: string
  category: string
  deadline: string
  reasoning: string
  estimated_hours: number
}

interface MockInfo {
  frequency: string
  next_mock: string
  focus_areas: string[]
}

interface MockStrategy {
  cat_mocks: MockInfo
  gate_mocks: MockInfo
  placement_mocks: MockInfo
}

interface WeeklyTarget {
  subject: string
  hours: number
  topics_count: number
}

interface ScoreTarget {
  exam: string
  current_score: string
  target_score: string
}

interface PerformanceMetrics {
  weekly_targets: WeeklyTarget[]
  monthly_score_targets: ScoreTarget[]
  burnout_risk: string
  burnout_recommendations: string[]
}

interface AgentResult {
  timeline_analysis?: TimelineAnalysis
  weekly_schedule?: DaySchedule[]
  monthly_roadmap?: MonthRoadmap[]
  priority_tasks?: PriorityTask[]
  mock_strategy?: MockStrategy
  performance_metrics?: PerformanceMetrics
  key_insights?: string[]
}

interface FormData {
  branch: string
  semester: string
  studyHours: string
  burnoutLevel: string
  placements: boolean
  cat: boolean
  gate: boolean
  semesterDate: string
  catDate: string
  gateDate: string
  placementDate: string
  dsaLevel: string
  catScore: string
  gateScore: string
  strongSubject: string
  weakSubject: string
  labDays: string
  additionalContext: string
}

// --- Constants ---
const AGENT_ID = '699969eecf2aa167c05474fc'

const LOADING_MESSAGES = [
  'Analyzing your timeline and deadlines...',
  'Building cognitive-optimized study blocks...',
  'Designing weekly schedule...',
  'Creating monthly roadmap...',
  'Calculating priority tasks...',
  'Formulating mock test strategy...',
  'Assessing burnout risk and metrics...',
]

const INITIAL_FORM: FormData = {
  branch: '',
  semester: '',
  studyHours: '',
  burnoutLevel: '',
  placements: false,
  cat: false,
  gate: false,
  semesterDate: '',
  catDate: '',
  gateDate: '',
  placementDate: '',
  dsaLevel: '',
  catScore: '',
  gateScore: '',
  strongSubject: '',
  weakSubject: '',
  labDays: '',
  additionalContext: '',
}

const SAMPLE_FORM: FormData = {
  branch: 'CSE',
  semester: '5th',
  studyHours: '8',
  burnoutLevel: 'Moderate',
  placements: true,
  cat: true,
  gate: true,
  semesterDate: '2026-04-07',
  catDate: '2026-06-21',
  gateDate: '2026-08-20',
  placementDate: '2026-05-22',
  dsaLevel: 'Intermediate',
  catScore: '78',
  gateScore: '52',
  strongSubject: 'Data Structures & Algorithms',
  weakSubject: 'Aptitude & Verbal Reasoning',
  labDays: 'Mon, Wed, Fri',
  additionalContext: 'I have a mini project submission due in 3 weeks. Also planning to participate in a hackathon next month.',
}

const SAMPLE_DATA: AgentResult = {
  timeline_analysis: {
    upcoming_deadlines: [
      { exam: 'Semester Exams', date: '2026-04-07', days_remaining: 45, urgency: 'High' },
      { exam: 'Placement Season', date: '2026-05-22', days_remaining: 90, urgency: 'High' },
      { exam: 'CAT 2026', date: '2026-06-21', days_remaining: 120, urgency: 'Medium' },
      { exam: 'GATE 2027', date: '2026-08-20', days_remaining: 180, urgency: 'Low' },
    ],
    priority_order: [
      'Semester Exams (45 days - immediate focus)',
      'Placement Prep - DSA & CS Fundamentals (90 days)',
      'CAT Quantitative & Verbal (120 days)',
      'GATE Core Subjects (180 days - long-term)',
    ],
  },
  weekly_schedule: [
    {
      day: 'Monday',
      blocks: [
        { time: '6:00-7:30', subject: 'CAT', topic: 'Quantitative Aptitude - Arithmetic', type: 'Practice', difficulty: 'Medium' },
        { time: '8:00-10:00', subject: 'Semester', topic: 'Computer Networks - TCP/IP', type: 'Lecture', difficulty: 'Medium' },
        { time: '14:00-16:00', subject: 'Placement', topic: 'DSA - Binary Trees & BST', type: 'Practice', difficulty: 'Hard' },
        { time: '16:30-17:30', subject: 'GATE', topic: 'Digital Logic - Combinational Circuits', type: 'Revision', difficulty: 'Easy' },
        { time: '20:00-21:00', subject: 'CAT', topic: 'Reading Comprehension Practice', type: 'Practice', difficulty: 'Medium' },
      ],
    },
    {
      day: 'Tuesday',
      blocks: [
        { time: '6:00-7:30', subject: 'Placement', topic: 'DSA - Graph Algorithms', type: 'Practice', difficulty: 'Hard' },
        { time: '9:00-11:00', subject: 'Semester', topic: 'Operating Systems - Scheduling', type: 'Lecture', difficulty: 'Medium' },
        { time: '14:00-15:30', subject: 'GATE', topic: 'Theory of Computation - DFA/NFA', type: 'Practice', difficulty: 'Hard' },
        { time: '16:00-17:00', subject: 'CAT', topic: 'Logical Reasoning - Arrangements', type: 'Practice', difficulty: 'Medium' },
        { time: '20:00-21:30', subject: 'Placement', topic: 'System Design Basics', type: 'Revision', difficulty: 'Medium' },
      ],
    },
    {
      day: 'Wednesday',
      blocks: [
        { time: '6:00-7:30', subject: 'CAT', topic: 'Data Interpretation - Charts & Tables', type: 'Practice', difficulty: 'Medium' },
        { time: '8:00-10:00', subject: 'Semester', topic: 'DBMS - Normalization', type: 'Lecture', difficulty: 'Medium' },
        { time: '14:00-16:00', subject: 'Placement', topic: 'DSA - Dynamic Programming', type: 'Practice', difficulty: 'Hard' },
        { time: '16:30-17:30', subject: 'GATE', topic: 'Computer Organization - Pipeline', type: 'Revision', difficulty: 'Medium' },
      ],
    },
    {
      day: 'Thursday',
      blocks: [
        { time: '6:00-7:30', subject: 'Placement', topic: 'DSA - Heap & Priority Queue', type: 'Practice', difficulty: 'Medium' },
        { time: '9:00-11:00', subject: 'Semester', topic: 'Software Engineering - SDLC Models', type: 'Lecture', difficulty: 'Easy' },
        { time: '14:00-15:30', subject: 'GATE', topic: 'Discrete Mathematics - Graph Theory', type: 'Practice', difficulty: 'Hard' },
        { time: '16:00-17:30', subject: 'CAT', topic: 'Verbal Ability - Para Jumbles', type: 'Practice', difficulty: 'Medium' },
        { time: '20:00-21:00', subject: 'Semester', topic: 'Previous Year Paper Solving', type: 'Revision', difficulty: 'Medium' },
      ],
    },
    {
      day: 'Friday',
      blocks: [
        { time: '6:00-7:30', subject: 'CAT', topic: 'QA - Number Systems & Algebra', type: 'Practice', difficulty: 'Hard' },
        { time: '8:00-10:00', subject: 'Semester', topic: 'Computer Networks - Routing', type: 'Lecture', difficulty: 'Medium' },
        { time: '14:00-16:00', subject: 'Placement', topic: 'DSA - Sliding Window & Two Pointer', type: 'Practice', difficulty: 'Medium' },
        { time: '16:30-17:30', subject: 'GATE', topic: 'Compiler Design - Parsing', type: 'Revision', difficulty: 'Hard' },
      ],
    },
    {
      day: 'Saturday',
      blocks: [
        { time: '7:00-9:00', subject: 'Placement', topic: 'Mock Interview Practice', type: 'Practice', difficulty: 'Hard' },
        { time: '10:00-12:00', subject: 'CAT', topic: 'Full Section Mock - QA', type: 'Practice', difficulty: 'Hard' },
        { time: '14:00-16:00', subject: 'GATE', topic: 'Subject-wise Test - Algorithms', type: 'Practice', difficulty: 'Hard' },
        { time: '17:00-18:00', subject: 'Semester', topic: 'Revision - OS & Networks', type: 'Revision', difficulty: 'Medium' },
      ],
    },
    {
      day: 'Sunday',
      blocks: [
        { time: '8:00-10:00', subject: 'CAT', topic: 'Full Mock Test Analysis', type: 'Revision', difficulty: 'Medium' },
        { time: '10:30-12:00', subject: 'Placement', topic: 'Competitive Coding Contest', type: 'Practice', difficulty: 'Hard' },
        { time: '14:00-15:00', subject: 'GATE', topic: 'Weak Area Revision', type: 'Revision', difficulty: 'Medium' },
        { time: '15:30-16:30', subject: 'Break', topic: 'Rest & Recovery', type: 'Buffer', difficulty: 'Easy' },
      ],
    },
  ],
  monthly_roadmap: [
    {
      month: 'March 2026',
      weeks: [
        { week: 1, focus_areas: ['Semester - Networks & DBMS', 'DSA - Trees & Graphs'], milestones: ['Complete Binary Tree problems (50+)', 'Finish Networks Unit 1-2'] },
        { week: 2, focus_areas: ['Semester - OS Scheduling', 'CAT QA - Arithmetic'], milestones: ['Solve 100 CAT QA problems', 'OS mid-semester prep done'] },
        { week: 3, focus_areas: ['Semester Revision Sprint', 'Placement DSA - DP Basics'], milestones: ['Complete semester revision notes', 'Solve 30 DP problems'] },
        { week: 4, focus_areas: ['Semester Exams Prep', 'Light CAT Practice'], milestones: ['All semester PYQs solved', 'Take 1 CAT sectional mock'] },
      ],
    },
    {
      month: 'April 2026',
      weeks: [
        { week: 1, focus_areas: ['Semester Exams', 'Light DSA Revision'], milestones: ['Semester exams completed', 'Maintain DSA streak'] },
        { week: 2, focus_areas: ['Placement - Full DSA Sprint', 'CAT - LR & DI'], milestones: ['Complete 200 DSA problems total', 'Score 85+ in CAT LR mock'] },
        { week: 3, focus_areas: ['Placement - CS Fundamentals', 'GATE - Core Subjects Start'], milestones: ['OS + DBMS + Networks revision done', 'GATE syllabus mapping complete'] },
        { week: 4, focus_areas: ['Placement Mock Interviews', 'CAT Full Mocks'], milestones: ['Complete 5 mock interviews', 'Take 2 full CAT mocks'] },
      ],
    },
    {
      month: 'May 2026',
      weeks: [
        { week: 1, focus_areas: ['Placement Season Prep', 'CAT - Verbal Focus'], milestones: ['Resume & cover letter finalized', 'RC accuracy above 80%'] },
        { week: 2, focus_areas: ['Placement Interviews', 'GATE - TOC & Compiler Design'], milestones: ['Attend 3+ placement drives', 'Complete TOC syllabus'] },
        { week: 3, focus_areas: ['Placement + CAT Balance', 'GATE Practice Tests'], milestones: ['CAT mock score: 85+ percentile', 'GATE subject test score: 60+'] },
        { week: 4, focus_areas: ['CAT Intensive', 'GATE Discrete Math'], milestones: ['Take 3 full CAT mocks', 'Complete discrete math syllabus'] },
      ],
    },
  ],
  priority_tasks: [
    { task: 'Complete Computer Networks Unit 1-3 revision', category: 'Semester', deadline: '2026-03-15', reasoning: 'Semester exams are nearest deadline; Networks carries high weightage', estimated_hours: 12 },
    { task: 'Solve 50 Binary Tree + BST problems on LeetCode', category: 'Placement', deadline: '2026-03-10', reasoning: 'Trees are fundamental to DSA rounds; builds strong recursive thinking', estimated_hours: 15 },
    { task: 'Complete CAT QA Arithmetic module', category: 'CAT', deadline: '2026-03-20', reasoning: 'Arithmetic is 30-40% of QA section; quick wins for percentile boost', estimated_hours: 10 },
    { task: 'Revise Operating Systems scheduling algorithms', category: 'Semester', deadline: '2026-03-12', reasoning: 'High-priority topic for both semester and GATE exams', estimated_hours: 6 },
    { task: 'Take first GATE subject-wise test (Algorithms)', category: 'GATE', deadline: '2026-03-25', reasoning: 'Baseline assessment needed to calibrate GATE prep intensity', estimated_hours: 3 },
    { task: 'Practice 20 Reading Comprehension passages', category: 'CAT', deadline: '2026-03-18', reasoning: 'Verbal is identified weak area; needs consistent daily practice', estimated_hours: 8 },
    { task: 'Build mini project for submission', category: 'Semester', deadline: '2026-03-14', reasoning: 'Hard deadline; cannot be postponed without academic penalty', estimated_hours: 20 },
    { task: 'Complete System Design fundamentals notes', category: 'Placement', deadline: '2026-03-30', reasoning: 'Many companies ask system design in interviews; need baseline knowledge', estimated_hours: 8 },
  ],
  mock_strategy: {
    cat_mocks: {
      frequency: 'Weekly - Every Saturday',
      next_mock: '2026-03-08',
      focus_areas: ['Quantitative Aptitude - Arithmetic & Algebra', 'Data Interpretation - Caselets', 'Reading Comprehension - Inference-based', 'Logical Reasoning - Arrangements & Puzzles'],
    },
    gate_mocks: {
      frequency: 'Bi-weekly - Alternate Saturdays',
      next_mock: '2026-03-15',
      focus_areas: ['Algorithms & Data Structures', 'Theory of Computation', 'Digital Logic & Computer Organization', 'Discrete Mathematics'],
    },
    placement_mocks: {
      frequency: '3x per week - Coding contests',
      next_mock: '2026-03-05',
      focus_areas: ['Dynamic Programming patterns', 'Graph traversal problems', 'Array manipulation techniques', 'Behavioral interview prep'],
    },
  },
  performance_metrics: {
    weekly_targets: [
      { subject: 'DSA / Placement', hours: 14, topics_count: 8 },
      { subject: 'CAT Preparation', hours: 10, topics_count: 5 },
      { subject: 'Semester Subjects', hours: 12, topics_count: 6 },
      { subject: 'GATE Core', hours: 8, topics_count: 4 },
      { subject: 'Mock Tests & Analysis', hours: 6, topics_count: 3 },
      { subject: 'Rest & Buffer', hours: 6, topics_count: 0 },
    ],
    monthly_score_targets: [
      { exam: 'CAT Mock', current_score: '78 percentile', target_score: '90 percentile' },
      { exam: 'GATE Subject Test', current_score: '52/100', target_score: '70/100' },
      { exam: 'LeetCode Rating', current_score: '1450', target_score: '1700' },
      { exam: 'Semester GPA', current_score: '7.8', target_score: '8.5+' },
    ],
    burnout_risk: 'Moderate',
    burnout_recommendations: [
      'Maintain strict 6-hour sleep minimum; aim for 7 hours on non-exam weeks',
      'Schedule 1 full rest day every 2 weeks with zero academic work',
      'Use the Pomodoro technique (50 min focus, 10 min break) for deep-work sessions',
      'Alternate between high-intensity (DSA/Mocks) and low-intensity (revision/reading) blocks',
      'Track energy levels daily; shift difficult topics to your peak cognitive hours',
    ],
  },
  key_insights: [
    'Your semester exams are the most imminent deadline at 45 days. Prioritize these for the next 3 weeks, but maintain DSA practice momentum to avoid regression.',
    'With an intermediate DSA level and 8 hours/day, you can realistically target 200+ LeetCode problems before placement season. Focus on patterns, not just problem count.',
    'CAT at 78 percentile shows good potential. A focused push on Verbal (your weak area) can yield 8-10 percentile improvement in 2 months.',
    'GATE prep at 180 days out gives you the most runway. Use it for long-term concept building, not cramming. 2-3 hours daily is sufficient at this stage.',
    'Your lab days (Mon, Wed, Fri) will fragment study blocks. Use these afternoons for lighter revision, and save deep-work sessions for Tue/Thu/Sat.',
    'The mini project deadline overlaps with exam prep. Allocate focused 3-hour blocks for it this week to avoid last-minute panic.',
    'Cross-preparation synergies exist: OS and DBMS prep serves both Semester and GATE. DSA serves both Placements and GATE. Leverage these overlaps to maximize ROI.',
  ],
}

const TAB_CONFIG = [
  { id: 'timeline', label: 'Timeline & Priorities', icon: FiCalendar },
  { id: 'weekly', label: 'Weekly Schedule', icon: FiClock },
  { id: 'roadmap', label: 'Monthly Roadmap', icon: FiMap },
  { id: 'mocks', label: 'Mock Strategy', icon: FiTarget },
  { id: 'metrics', label: 'Performance', icon: FiTrendingUp },
  { id: 'insights', label: 'Key Insights', icon: FiZap },
  { id: 'fullplan', label: 'Full Plan', icon: FiFileText },
] as const

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

// --- Helper: urgency color ---
function urgencyColor(urgency: string): string {
  const u = (urgency ?? '').toLowerCase()
  if (u === 'critical') return 'bg-red-100 text-red-800 border-red-200'
  if (u === 'high') return 'bg-orange-100 text-orange-800 border-orange-200'
  if (u === 'medium') return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  if (u === 'low') return 'bg-green-100 text-green-800 border-green-200'
  return 'bg-secondary text-secondary-foreground'
}

function burnoutColor(risk: string): string {
  const r = (risk ?? '').toLowerCase()
  if (r === 'critical') return 'bg-red-100 text-red-800 border-red-200'
  if (r === 'high') return 'bg-orange-100 text-orange-800 border-orange-200'
  if (r === 'moderate') return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  if (r === 'low') return 'bg-green-100 text-green-800 border-green-200'
  return 'bg-secondary text-secondary-foreground'
}

function subjectColor(subject: string): string {
  const s = (subject ?? '').toLowerCase()
  if (s.includes('placement') || s.includes('dsa')) return 'bg-blue-50 border-blue-200 text-blue-900'
  if (s.includes('cat')) return 'bg-purple-50 border-purple-200 text-purple-900'
  if (s.includes('gate')) return 'bg-green-50 border-green-200 text-green-900'
  if (s.includes('semester')) return 'bg-amber-50 border-amber-200 text-amber-900'
  if (s.includes('break') || s.includes('buffer') || s.includes('rest')) return 'bg-gray-50 border-gray-200 text-gray-600'
  return 'bg-secondary/50 border-border text-foreground'
}

function subjectBadgeColor(subject: string): string {
  const s = (subject ?? '').toLowerCase()
  if (s.includes('placement') || s.includes('dsa')) return 'bg-blue-100 text-blue-800 border-blue-200'
  if (s.includes('cat')) return 'bg-purple-100 text-purple-800 border-purple-200'
  if (s.includes('gate')) return 'bg-green-100 text-green-800 border-green-200'
  if (s.includes('semester')) return 'bg-amber-100 text-amber-800 border-amber-200'
  if (s.includes('mock')) return 'bg-pink-100 text-pink-800 border-pink-200'
  if (s.includes('rest') || s.includes('buffer')) return 'bg-gray-100 text-gray-600 border-gray-200'
  return 'bg-secondary text-secondary-foreground'
}

function categoryBadgeColor(cat: string): string {
  const c = (cat ?? '').toLowerCase()
  if (c === 'placement') return 'bg-blue-100 text-blue-800 border-blue-200'
  if (c === 'cat') return 'bg-purple-100 text-purple-800 border-purple-200'
  if (c === 'gate') return 'bg-green-100 text-green-800 border-green-200'
  if (c === 'semester') return 'bg-amber-100 text-amber-800 border-amber-200'
  return 'bg-secondary text-secondary-foreground'
}

function difficultyIndicator(difficulty: string): React.ReactNode {
  const d = (difficulty ?? '').toLowerCase()
  if (d === 'hard') return <span className="text-xs text-red-600 font-mono">HRD</span>
  if (d === 'medium') return <span className="text-xs text-yellow-600 font-mono">MED</span>
  if (d === 'easy') return <span className="text-xs text-green-600 font-mono">EZ</span>
  return <span className="text-xs text-muted-foreground font-mono">{difficulty ?? ''}</span>
}

// --- CopyButton ---
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

// --- LoadingState ---
function LoadingState() {
  const [messageIdx, setMessageIdx] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIdx((prev) => (prev + 1) % LOADING_MESSAGES.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 justify-center py-6">
        <FiLoader className="h-5 w-5 animate-spin text-foreground" />
        <p className="text-sm font-medium">{LOADING_MESSAGES[messageIdx]}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((n) => (
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

// --- Tab: Timeline & Priorities ---
function TimelineTab({ data }: { data: AgentResult }) {
  const deadlines = Array.isArray(data?.timeline_analysis?.upcoming_deadlines) ? data.timeline_analysis.upcoming_deadlines : []
  const priorityOrder = Array.isArray(data?.timeline_analysis?.priority_order) ? data.timeline_analysis.priority_order : []
  const tasks = Array.isArray(data?.priority_tasks) ? data.priority_tasks : []
  const [expandedTask, setExpandedTask] = useState<number | null>(null)

  const sectionText = [
    'DEADLINES:',
    ...deadlines.map(d => `- ${d?.exam ?? ''}: ${d?.date ?? ''} (${d?.days_remaining ?? 0} days, ${d?.urgency ?? ''})`),
    '',
    'PRIORITY ORDER:',
    ...priorityOrder.map((p, i) => `${i + 1}. ${p}`),
    '',
    'PRIORITY TASKS:',
    ...tasks.map(t => `- ${t?.task ?? ''} [${t?.category ?? ''}] Due: ${t?.deadline ?? ''} (${t?.estimated_hours ?? 0}h) - ${t?.reasoning ?? ''}`),
  ].join('\n')

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-bold" style={{ letterSpacing: '-0.02em' }}>Timeline & Priorities</h3>
        <CopyButton text={sectionText} label="Copy Section" />
      </div>

      {/* Deadlines */}
      <div>
        <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Upcoming Deadlines</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {deadlines.map((d, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{d?.exam ?? ''}</span>
                  <Badge className={urgencyColor(d?.urgency ?? '')}>{d?.urgency ?? ''}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{d?.date ?? ''}</div>
                <div className="text-2xl font-mono font-bold">{d?.days_remaining ?? 0}</div>
                <div className="text-xs text-muted-foreground">days remaining</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Priority Order */}
      {priorityOrder.length > 0 && (
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Priority Order</h4>
          <Card>
            <CardContent className="p-4">
              <ol className="space-y-2">
                {priorityOrder.map((p, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-primary text-primary-foreground text-xs font-bold">{i + 1}</span>
                    <span className="leading-relaxed">{p}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Priority Tasks */}
      {tasks.length > 0 && (
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Priority Tasks</h4>
          <div className="space-y-2">
            {tasks.map((t, i) => (
              <Card key={i}>
                <CardContent className="p-0">
                  <button
                    onClick={() => setExpandedTask(expandedTask === i ? null : i)}
                    className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{t?.task ?? ''}</span>
                        <Badge className={categoryBadgeColor(t?.category ?? '')}>{t?.category ?? ''}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>Due: {t?.deadline ?? ''}</span>
                        <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                        <span className="font-mono">{t?.estimated_hours ?? 0}h</span>
                      </div>
                    </div>
                    {expandedTask === i ? (
                      <FiChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <FiChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>
                  {expandedTask === i && (
                    <div className="px-4 pb-4 border-t pt-3">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reasoning</span>
                      <p className="text-sm mt-1 leading-relaxed">{t?.reasoning ?? ''}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// --- Tab: Weekly Schedule ---
function WeeklyTab({ data }: { data: AgentResult }) {
  const schedule = Array.isArray(data?.weekly_schedule) ? data.weekly_schedule : []

  const sectionText = schedule.map(day => {
    const blocks = Array.isArray(day?.blocks) ? day.blocks : []
    return `${day?.day ?? ''}:\n${blocks.map(b => `  ${b?.time ?? ''} | ${b?.subject ?? ''} | ${b?.topic ?? ''} (${b?.type ?? ''}, ${b?.difficulty ?? ''})`).join('\n')}`
  }).join('\n\n')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-bold" style={{ letterSpacing: '-0.02em' }}>Weekly Schedule</h3>
        <CopyButton text={sectionText} label="Copy Section" />
      </div>

      {/* Desktop: grid view */}
      <div className="hidden lg:block">
        <ScrollArea className="w-full">
          <div className="grid grid-cols-7 gap-2 min-w-[900px]">
            {schedule.map((day, di) => {
              const blocks = Array.isArray(day?.blocks) ? day.blocks : []
              return (
                <div key={di} className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wide text-center py-2 bg-muted border">{day?.day ?? ''}</div>
                  {blocks.map((b, bi) => (
                    <div key={bi} className={`border p-2 space-y-1 ${subjectColor(b?.subject ?? '')}`}>
                      <div className="text-xs font-mono font-medium">{b?.time ?? ''}</div>
                      <div className="text-xs font-semibold">{b?.subject ?? ''}</div>
                      <div className="text-xs text-inherit/80 leading-snug">{b?.topic ?? ''}</div>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{b?.type ?? ''}</Badge>
                        {difficultyIndicator(b?.difficulty ?? '')}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Mobile: stacked view */}
      <div className="lg:hidden space-y-4">
        {schedule.map((day, di) => {
          const blocks = Array.isArray(day?.blocks) ? day.blocks : []
          return (
            <Card key={di}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wide">{day?.day ?? ''}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {blocks.map((b, bi) => (
                  <div key={bi} className={`border p-3 ${subjectColor(b?.subject ?? '')}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-medium">{b?.time ?? ''}</span>
                      {difficultyIndicator(b?.difficulty ?? '')}
                    </div>
                    <div className="text-sm font-semibold">{b?.subject ?? ''}</div>
                    <div className="text-xs mt-0.5">{b?.topic ?? ''}</div>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 mt-1">{b?.type ?? ''}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// --- Tab: Monthly Roadmap ---
function RoadmapTab({ data }: { data: AgentResult }) {
  const roadmap = Array.isArray(data?.monthly_roadmap) ? data.monthly_roadmap : []

  const sectionText = roadmap.map(m => {
    const weeks = Array.isArray(m?.weeks) ? m.weeks : []
    return `${m?.month ?? ''}:\n${weeks.map(w => {
      const fa = Array.isArray(w?.focus_areas) ? w.focus_areas : []
      const ms = Array.isArray(w?.milestones) ? w.milestones : []
      return `  Week ${w?.week ?? 0}: Focus: ${fa.join(', ')} | Milestones: ${ms.join(', ')}`
    }).join('\n')}`
  }).join('\n\n')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-bold" style={{ letterSpacing: '-0.02em' }}>Monthly Roadmap</h3>
        <CopyButton text={sectionText} label="Copy Section" />
      </div>

      <div className="space-y-6">
        {roadmap.map((m, mi) => {
          const weeks = Array.isArray(m?.weeks) ? m.weeks : []
          return (
            <Card key={mi}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-serif font-bold" style={{ letterSpacing: '-0.02em' }}>{m?.month ?? ''}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {weeks.map((w, wi) => {
                  const focusAreas = Array.isArray(w?.focus_areas) ? w.focus_areas : []
                  const milestones = Array.isArray(w?.milestones) ? w.milestones : []
                  return (
                    <div key={wi} className="border p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Week {w?.week ?? wi + 1}</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Focus Areas</span>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {focusAreas.map((fa, fi) => (
                            <Badge key={fi} variant="secondary" className="text-xs">{fa}</Badge>
                          ))}
                        </div>
                      </div>
                      {milestones.length > 0 && (
                        <div>
                          <span className="text-xs text-muted-foreground uppercase tracking-wide">Milestones</span>
                          <ul className="mt-1.5 space-y-1">
                            {milestones.map((ms, msi) => (
                              <li key={msi} className="flex items-start gap-2 text-sm">
                                <FiCheck className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                <span>{ms}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// --- Tab: Mock Strategy ---
function MocksTab({ data }: { data: AgentResult }) {
  const strategy = data?.mock_strategy
  const entries: { title: string; icon: React.ReactNode; info: MockInfo | undefined }[] = [
    { title: 'CAT Mocks', icon: <FiBookOpen className="h-4 w-4" />, info: strategy?.cat_mocks },
    { title: 'GATE Mocks', icon: <FiCpu className="h-4 w-4" />, info: strategy?.gate_mocks },
    { title: 'Placement Mocks', icon: <FiUsers className="h-4 w-4" />, info: strategy?.placement_mocks },
  ]

  const sectionText = entries.map(e => {
    const areas = Array.isArray(e.info?.focus_areas) ? e.info.focus_areas : []
    return `${e.title}:\n  Frequency: ${e.info?.frequency ?? 'N/A'}\n  Next Mock: ${e.info?.next_mock ?? 'N/A'}\n  Focus: ${areas.join(', ')}`
  }).join('\n\n')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-bold" style={{ letterSpacing: '-0.02em' }}>Mock Test Strategy</h3>
        <CopyButton text={sectionText} label="Copy Section" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {entries.map((e, i) => {
          const areas = Array.isArray(e.info?.focus_areas) ? e.info.focus_areas : []
          return (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  {e.icon}
                  <CardTitle className="text-sm font-bold">{e.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Frequency</span>
                  <p className="text-sm font-medium mt-0.5">{e.info?.frequency ?? 'N/A'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Next Mock</span>
                  <p className="text-sm font-mono font-medium mt-0.5">{e.info?.next_mock ?? 'N/A'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Focus Areas</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {areas.map((a, ai) => (
                      <Badge key={ai} variant="secondary" className="text-xs">{a}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// --- Tab: Performance Metrics ---
function MetricsTab({ data }: { data: AgentResult }) {
  const metrics = data?.performance_metrics
  const weeklyTargets = Array.isArray(metrics?.weekly_targets) ? metrics.weekly_targets : []
  const scoreTargets = Array.isArray(metrics?.monthly_score_targets) ? metrics.monthly_score_targets : []
  const burnoutRisk = metrics?.burnout_risk ?? ''
  const burnoutRecs = Array.isArray(metrics?.burnout_recommendations) ? metrics.burnout_recommendations : []

  const sectionText = [
    'WEEKLY TARGETS:',
    ...weeklyTargets.map(t => `  ${t?.subject ?? ''}: ${t?.hours ?? 0}h, ${t?.topics_count ?? 0} topics`),
    '',
    'MONTHLY SCORE TARGETS:',
    ...scoreTargets.map(s => `  ${s?.exam ?? ''}: ${s?.current_score ?? ''} -> ${s?.target_score ?? ''}`),
    '',
    `BURNOUT RISK: ${burnoutRisk}`,
    'RECOMMENDATIONS:',
    ...burnoutRecs.map((r, i) => `  ${i + 1}. ${r}`),
  ].join('\n')

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-bold" style={{ letterSpacing: '-0.02em' }}>Performance Metrics</h3>
        <CopyButton text={sectionText} label="Copy Section" />
      </div>

      {/* Weekly Targets */}
      {weeklyTargets.length > 0 && (
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Weekly Targets</h4>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left p-3 font-medium uppercase tracking-wide text-xs text-muted-foreground">Subject</th>
                      <th className="text-right p-3 font-medium uppercase tracking-wide text-xs text-muted-foreground">Hours/Week</th>
                      <th className="text-right p-3 font-medium uppercase tracking-wide text-xs text-muted-foreground">Topics</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyTargets.map((t, i) => (
                      <tr key={i} className="border-b last:border-b-0">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 ${subjectBadgeColor(t?.subject ?? '').includes('blue') ? 'bg-blue-500' : subjectBadgeColor(t?.subject ?? '').includes('purple') ? 'bg-purple-500' : subjectBadgeColor(t?.subject ?? '').includes('green') ? 'bg-green-500' : subjectBadgeColor(t?.subject ?? '').includes('amber') ? 'bg-amber-500' : subjectBadgeColor(t?.subject ?? '').includes('pink') ? 'bg-pink-500' : 'bg-gray-400'}`} />
                            <span className="font-medium">{t?.subject ?? ''}</span>
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono">{t?.hours ?? 0}h</td>
                        <td className="p-3 text-right font-mono">{t?.topics_count ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Score Targets */}
      {scoreTargets.length > 0 && (
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Monthly Score Targets</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {scoreTargets.map((s, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-2">
                  <span className="text-sm font-semibold">{s?.exam ?? ''}</span>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex-1">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">Current</span>
                      <p className="font-mono font-medium">{s?.current_score ?? ''}</p>
                    </div>
                    <FiTrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 text-right">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">Target</span>
                      <p className="font-mono font-bold">{s?.target_score ?? ''}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Burnout Risk */}
      <div>
        <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Burnout Assessment</h4>
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <FiActivity className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Burnout Risk Level:</span>
              <Badge className={burnoutColor(burnoutRisk)}>{burnoutRisk || 'Unknown'}</Badge>
            </div>
            {burnoutRecs.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Recommendations</span>
                <ul className="mt-2 space-y-2">
                  {burnoutRecs.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
                      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-secondary text-secondary-foreground text-xs font-medium mt-0.5">{i + 1}</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// --- Tab: Key Insights ---
function InsightsTab({ data }: { data: AgentResult }) {
  const insights = Array.isArray(data?.key_insights) ? data.key_insights : []

  const sectionText = insights.map((ins, i) => `${i + 1}. ${ins}`).join('\n\n')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-bold" style={{ letterSpacing: '-0.02em' }}>Key Insights</h3>
        <CopyButton text={sectionText} label="Copy Section" />
      </div>

      {insights.length > 0 ? (
        <div className="space-y-3">
          {insights.map((ins, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground text-sm font-bold">{i + 1}</span>
                  <p className="text-sm leading-relaxed flex-1">{ins}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No insights available.</p>
      )}
    </div>
  )
}

// --- Tab: Full Plan ---
function FullPlanTab({ data, fullText }: { data: AgentResult; fullText: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-bold" style={{ letterSpacing: '-0.02em' }}>Full Study Plan</h3>
        <CopyButton text={fullText} label="Copy Full Plan" />
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-6 text-sm leading-relaxed">
            {/* Timeline */}
            <div>
              <h4 className="font-serif font-bold text-base mb-2" style={{ letterSpacing: '-0.02em' }}>Timeline Analysis</h4>
              {Array.isArray(data?.timeline_analysis?.upcoming_deadlines) && data.timeline_analysis.upcoming_deadlines.map((d, i) => (
                <p key={i} className="ml-4">- {d?.exam ?? ''}: {d?.date ?? ''} ({d?.days_remaining ?? 0} days, {d?.urgency ?? ''})</p>
              ))}
            </div>
            <Separator />

            {/* Priority Order */}
            {Array.isArray(data?.timeline_analysis?.priority_order) && data.timeline_analysis.priority_order.length > 0 && (
              <>
                <div>
                  <h4 className="font-serif font-bold text-base mb-2" style={{ letterSpacing: '-0.02em' }}>Priority Order</h4>
                  <ol className="ml-4 list-decimal list-inside space-y-1">
                    {data.timeline_analysis.priority_order.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ol>
                </div>
                <Separator />
              </>
            )}

            {/* Priority Tasks */}
            {Array.isArray(data?.priority_tasks) && data.priority_tasks.length > 0 && (
              <>
                <div>
                  <h4 className="font-serif font-bold text-base mb-2" style={{ letterSpacing: '-0.02em' }}>Priority Tasks</h4>
                  {data.priority_tasks.map((t, i) => (
                    <p key={i} className="ml-4 mb-1">- [{t?.category ?? ''}] {t?.task ?? ''} (Due: {t?.deadline ?? ''}, {t?.estimated_hours ?? 0}h)</p>
                  ))}
                </div>
                <Separator />
              </>
            )}

            {/* Weekly Schedule Summary */}
            {Array.isArray(data?.weekly_schedule) && data.weekly_schedule.length > 0 && (
              <>
                <div>
                  <h4 className="font-serif font-bold text-base mb-2" style={{ letterSpacing: '-0.02em' }}>Weekly Schedule</h4>
                  {data.weekly_schedule.map((day, di) => {
                    const blocks = Array.isArray(day?.blocks) ? day.blocks : []
                    return (
                      <div key={di} className="ml-4 mb-2">
                        <p className="font-semibold">{day?.day ?? ''}</p>
                        {blocks.map((b, bi) => (
                          <p key={bi} className="ml-4 text-muted-foreground">{b?.time ?? ''} | {b?.subject ?? ''}: {b?.topic ?? ''}</p>
                        ))}
                      </div>
                    )
                  })}
                </div>
                <Separator />
              </>
            )}

            {/* Monthly Roadmap Summary */}
            {Array.isArray(data?.monthly_roadmap) && data.monthly_roadmap.length > 0 && (
              <>
                <div>
                  <h4 className="font-serif font-bold text-base mb-2" style={{ letterSpacing: '-0.02em' }}>Monthly Roadmap</h4>
                  {data.monthly_roadmap.map((m, mi) => {
                    const weeks = Array.isArray(m?.weeks) ? m.weeks : []
                    return (
                      <div key={mi} className="ml-4 mb-2">
                        <p className="font-semibold">{m?.month ?? ''}</p>
                        {weeks.map((w, wi) => {
                          const fa = Array.isArray(w?.focus_areas) ? w.focus_areas : []
                          return <p key={wi} className="ml-4 text-muted-foreground">Week {w?.week ?? wi + 1}: {fa.join(', ')}</p>
                        })}
                      </div>
                    )
                  })}
                </div>
                <Separator />
              </>
            )}

            {/* Mock Strategy */}
            {data?.mock_strategy && (
              <>
                <div>
                  <h4 className="font-serif font-bold text-base mb-2" style={{ letterSpacing: '-0.02em' }}>Mock Strategy</h4>
                  {[
                    { label: 'CAT', info: data.mock_strategy?.cat_mocks },
                    { label: 'GATE', info: data.mock_strategy?.gate_mocks },
                    { label: 'Placement', info: data.mock_strategy?.placement_mocks },
                  ].map((e, i) => (
                    <p key={i} className="ml-4">{e.label}: {e.info?.frequency ?? 'N/A'} (Next: {e.info?.next_mock ?? 'N/A'})</p>
                  ))}
                </div>
                <Separator />
              </>
            )}

            {/* Key Insights */}
            {Array.isArray(data?.key_insights) && data.key_insights.length > 0 && (
              <div>
                <h4 className="font-serif font-bold text-base mb-2" style={{ letterSpacing: '-0.02em' }}>Key Insights</h4>
                <ol className="ml-4 list-decimal list-inside space-y-1">
                  {data.key_insights.map((ins, i) => (
                    <li key={i}>{ins}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// --- Agent Status Bar ---
function AgentStatusBar({ isActive }: { isActive: boolean }) {
  return (
    <Card className="mt-8">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Agent</div>
            <Separator orientation="vertical" className="h-4" />
            <div className="text-sm font-medium">Dual Prep Master Planner</div>
            <span className="text-xs text-muted-foreground font-mono hidden sm:inline">({AGENT_ID})</span>
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
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<AgentResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('timeline')
  const [sampleMode, setSampleMode] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  const displayForm = sampleMode && formData.branch === '' ? SAMPLE_FORM : formData
  const displayResults = sampleMode && !results ? SAMPLE_DATA : results

  const updateField = useCallback((field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const buildMessage = useCallback((form: FormData): string => {
    const lines: string[] = [
      'Student Profile:',
      `- Branch: ${form.branch}`,
      `- Semester: ${form.semester}`,
      `- Available Study Hours/Day: ${form.studyHours}`,
      `- Burnout Level: ${form.burnoutLevel}`,
      '',
      'Exam Targets:',
    ]
    if (form.placements) lines.push(`- Placements: Yes (Season starts: ${form.placementDate})`)
    if (form.cat) lines.push(`- CAT: Yes (Exam date: ${form.catDate})`)
    if (form.gate) lines.push(`- GATE: Yes (Exam date: ${form.gateDate})`)
    lines.push(`- Semester Exams: ${form.semesterDate}`)
    lines.push('')
    lines.push('Current Preparation:')
    lines.push(`- DSA Level: ${form.dsaLevel}`)
    if (form.cat) lines.push(`- CAT Mock Score: ${form.catScore} percentile`)
    if (form.gate) lines.push(`- GATE Mock Score: ${form.gateScore}/100`)
    lines.push(`- Strongest Subject: ${form.strongSubject}`)
    lines.push(`- Weakest Subject: ${form.weakSubject}`)
    lines.push(`- Lab Days: ${form.labDays}`)
    if (form.additionalContext) {
      lines.push('')
      lines.push(`Additional Context: ${form.additionalContext}`)
    }
    lines.push('')
    lines.push('Please create a comprehensive dual-preparation study plan optimized for my profile. Include timeline analysis, weekly schedule, monthly roadmap, priority tasks, mock test strategy, performance metrics, and key strategic insights.')
    return lines.join('\n')
  }, [])

  const handleGenerate = useCallback(async () => {
    const form = formData.branch ? formData : (sampleMode ? SAMPLE_FORM : formData)
    if (!form.branch || !form.semester || !form.studyHours || !form.semesterDate) return

    setLoading(true)
    setError(null)
    setResults(null)
    setActiveAgentId(AGENT_ID)

    try {
      const message = buildMessage(form)
      const result: AIAgentResponse = await callAIAgent(message, AGENT_ID)

      if (result.success) {
        const rawResult = result?.response?.result
        let parsed = rawResult

        if (typeof rawResult === 'string') {
          parsed = parseLLMJson(rawResult)
        } else if (rawResult && typeof rawResult === 'object') {
          if (rawResult?.timeline_analysis || rawResult?.weekly_schedule) {
            parsed = rawResult
          } else {
            parsed = parseLLMJson(rawResult)
          }
        }

        if (parsed && typeof parsed === 'object' && !(parsed as Record<string, unknown>)?.error) {
          setResults(parsed as AgentResult)
          setActiveTab('timeline')
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
  }, [formData, sampleMode, buildMessage])

  const handleClear = useCallback(() => {
    setFormData(INITIAL_FORM)
    setResults(null)
    setError(null)
    setActiveTab('timeline')
  }, [])

  const canGenerate = (() => {
    const form = formData.branch ? formData : (sampleMode ? SAMPLE_FORM : formData)
    return !!(form.branch && form.semester && form.studyHours && form.semesterDate)
  })()

  const generateFullPlanText = useCallback((): string => {
    const data = displayResults
    if (!data) return ''
    const sections: string[] = ['=== DUALPREP MASTER STUDY PLAN ===', '']

    // Timeline
    const deadlines = Array.isArray(data?.timeline_analysis?.upcoming_deadlines) ? data.timeline_analysis.upcoming_deadlines : []
    sections.push('--- TIMELINE ANALYSIS ---')
    deadlines.forEach(d => sections.push(`  ${d?.exam ?? ''}: ${d?.date ?? ''} (${d?.days_remaining ?? 0} days, ${d?.urgency ?? ''})`))
    const pOrder = Array.isArray(data?.timeline_analysis?.priority_order) ? data.timeline_analysis.priority_order : []
    sections.push('Priority Order:')
    pOrder.forEach((p, i) => sections.push(`  ${i + 1}. ${p}`))
    sections.push('')

    // Tasks
    const tasks = Array.isArray(data?.priority_tasks) ? data.priority_tasks : []
    sections.push('--- PRIORITY TASKS ---')
    tasks.forEach(t => sections.push(`  [${t?.category ?? ''}] ${t?.task ?? ''} | Due: ${t?.deadline ?? ''} | ${t?.estimated_hours ?? 0}h | ${t?.reasoning ?? ''}`))
    sections.push('')

    // Weekly
    const schedule = Array.isArray(data?.weekly_schedule) ? data.weekly_schedule : []
    sections.push('--- WEEKLY SCHEDULE ---')
    schedule.forEach(day => {
      const blocks = Array.isArray(day?.blocks) ? day.blocks : []
      sections.push(`  ${day?.day ?? ''}:`)
      blocks.forEach(b => sections.push(`    ${b?.time ?? ''} | ${b?.subject ?? ''} | ${b?.topic ?? ''} (${b?.type ?? ''}, ${b?.difficulty ?? ''})`))
    })
    sections.push('')

    // Roadmap
    const roadmap = Array.isArray(data?.monthly_roadmap) ? data.monthly_roadmap : []
    sections.push('--- MONTHLY ROADMAP ---')
    roadmap.forEach(m => {
      const weeks = Array.isArray(m?.weeks) ? m.weeks : []
      sections.push(`  ${m?.month ?? ''}:`)
      weeks.forEach(w => {
        const fa = Array.isArray(w?.focus_areas) ? w.focus_areas : []
        const ms = Array.isArray(w?.milestones) ? w.milestones : []
        sections.push(`    Week ${w?.week ?? 0}: ${fa.join(', ')}`)
        ms.forEach(mi => sections.push(`      - ${mi}`))
      })
    })
    sections.push('')

    // Mocks
    sections.push('--- MOCK STRATEGY ---')
    const ms = data?.mock_strategy
    if (ms) {
      ;[
        { label: 'CAT', info: ms?.cat_mocks },
        { label: 'GATE', info: ms?.gate_mocks },
        { label: 'Placement', info: ms?.placement_mocks },
      ].forEach(e => {
        const areas = Array.isArray(e.info?.focus_areas) ? e.info.focus_areas : []
        sections.push(`  ${e.label}: ${e.info?.frequency ?? 'N/A'} | Next: ${e.info?.next_mock ?? 'N/A'} | Focus: ${areas.join(', ')}`)
      })
    }
    sections.push('')

    // Metrics
    sections.push('--- PERFORMANCE METRICS ---')
    const wt = Array.isArray(data?.performance_metrics?.weekly_targets) ? data.performance_metrics.weekly_targets : []
    wt.forEach(t => sections.push(`  ${t?.subject ?? ''}: ${t?.hours ?? 0}h/week, ${t?.topics_count ?? 0} topics`))
    const st = Array.isArray(data?.performance_metrics?.monthly_score_targets) ? data.performance_metrics.monthly_score_targets : []
    st.forEach(s => sections.push(`  ${s?.exam ?? ''}: ${s?.current_score ?? ''} -> ${s?.target_score ?? ''}`))
    sections.push(`  Burnout Risk: ${data?.performance_metrics?.burnout_risk ?? ''}`)
    const br = Array.isArray(data?.performance_metrics?.burnout_recommendations) ? data.performance_metrics.burnout_recommendations : []
    br.forEach((r, i) => sections.push(`  ${i + 1}. ${r}`))
    sections.push('')

    // Insights
    const insights = Array.isArray(data?.key_insights) ? data.key_insights : []
    sections.push('--- KEY INSIGHTS ---')
    insights.forEach((ins, i) => sections.push(`  ${i + 1}. ${ins}`))

    return sections.join('\n')
  }, [displayResults])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="font-serif text-2xl font-bold tracking-tight" style={{ letterSpacing: '-0.02em' }}>DualPrep</h1>
              <p className="text-xs text-muted-foreground mt-0.5 font-sans">Master Planner for Placements, CAT, GATE & Semester Exams</p>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer hidden sm:inline">Sample Data</Label>
              <Switch
                id="sample-toggle"
                checked={sampleMode}
                onCheckedChange={setSampleMode}
              />
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8" style={{ lineHeight: '1.7' }}>

          {/* Input Form */}
          <section>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FiBookOpen className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="font-serif text-lg" style={{ letterSpacing: '-0.02em' }}>Student Profile</CardTitle>
                </div>
                <CardDescription>Enter your details to generate a personalized dual-preparation study plan.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Section 1: Basic Info */}
                <div>
                  <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Basic Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">BTech Branch *</Label>
                      <Select value={displayForm.branch} onValueChange={(v) => updateField('branch', v)}>
                        <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                        <SelectContent>
                          {['CSE', 'ECE', 'EE', 'ME', 'CE', 'IT', 'Other'].map(b => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Current Semester *</Label>
                      <Select value={displayForm.semester} onValueChange={(v) => updateField('semester', v)}>
                        <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
                        <SelectContent>
                          {['3rd', '4th', '5th', '6th', '7th', '8th'].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Study Hours/Day *</Label>
                      <Input
                        type="number"
                        min={1}
                        max={16}
                        placeholder="e.g. 8"
                        value={displayForm.studyHours}
                        onChange={(e) => updateField('studyHours', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Burnout Level</Label>
                      <Select value={displayForm.burnoutLevel} onValueChange={(v) => updateField('burnoutLevel', v)}>
                        <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                        <SelectContent>
                          {['Low', 'Moderate', 'High', 'Critical'].map(l => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Section 2: Exam Targets */}
                <div>
                  <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Exam Targets</h4>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-6">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="placements"
                          checked={displayForm.placements}
                          onCheckedChange={(v) => updateField('placements', !!v)}
                        />
                        <Label htmlFor="placements" className="text-sm cursor-pointer">Placements</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="cat"
                          checked={displayForm.cat}
                          onCheckedChange={(v) => updateField('cat', !!v)}
                        />
                        <Label htmlFor="cat" className="text-sm cursor-pointer">CAT</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="gate"
                          checked={displayForm.gate}
                          onCheckedChange={(v) => updateField('gate', !!v)}
                        />
                        <Label htmlFor="gate" className="text-sm cursor-pointer">GATE</Label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Semester Exam Date *</Label>
                        <Input
                          type="date"
                          value={displayForm.semesterDate}
                          onChange={(e) => updateField('semesterDate', e.target.value)}
                        />
                      </div>
                      {displayForm.cat && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">CAT Exam Date</Label>
                          <Input
                            type="date"
                            value={displayForm.catDate}
                            onChange={(e) => updateField('catDate', e.target.value)}
                          />
                        </div>
                      )}
                      {displayForm.gate && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">GATE Exam Date</Label>
                          <Input
                            type="date"
                            value={displayForm.gateDate}
                            onChange={(e) => updateField('gateDate', e.target.value)}
                          />
                        </div>
                      )}
                      {displayForm.placements && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">Placement Season Start</Label>
                          <Input
                            type="date"
                            value={displayForm.placementDate}
                            onChange={(e) => updateField('placementDate', e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Section 3: Current Prep Status */}
                <div>
                  <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Current Preparation Status</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">DSA Level</Label>
                      <Select value={displayForm.dsaLevel} onValueChange={(v) => updateField('dsaLevel', v)}>
                        <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                        <SelectContent>
                          {['Beginner', 'Intermediate', 'Advanced'].map(l => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {displayForm.cat && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">CAT Mock Score</Label>
                        <Input
                          type="number"
                          placeholder="Enter percentile e.g. 85"
                          value={displayForm.catScore}
                          onChange={(e) => updateField('catScore', e.target.value)}
                        />
                      </div>
                    )}
                    {displayForm.gate && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">GATE Mock Score</Label>
                        <Input
                          type="number"
                          placeholder="Enter marks out of 100"
                          value={displayForm.gateScore}
                          onChange={(e) => updateField('gateScore', e.target.value)}
                        />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Strongest Subject</Label>
                      <Input
                        type="text"
                        placeholder="e.g. Data Structures"
                        value={displayForm.strongSubject}
                        onChange={(e) => updateField('strongSubject', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Weakest Subject</Label>
                      <Input
                        type="text"
                        placeholder="e.g. Aptitude"
                        value={displayForm.weakSubject}
                        onChange={(e) => updateField('weakSubject', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">College Lab Days</Label>
                      <Input
                        type="text"
                        placeholder="e.g. Mon, Wed, Fri"
                        value={displayForm.labDays}
                        onChange={(e) => updateField('labDays', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Section 4: Additional Context */}
                <div>
                  <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Additional Context</h4>
                  <Textarea
                    placeholder="Any specific concerns, upcoming events, or constraints? (optional)"
                    className="min-h-[80px] text-sm"
                    value={displayForm.additionalContext}
                    onChange={(e) => updateField('additionalContext', e.target.value)}
                  />
                </div>

                {/* CTA */}
                <div className="flex items-center justify-center gap-4 pt-2">
                  <Button
                    onClick={handleGenerate}
                    disabled={loading || !canGenerate}
                    className="px-8 py-3 text-sm font-medium tracking-wide"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FiSend className="mr-2 h-4 w-4" />
                        Generate My Plan
                      </>
                    )}
                  </Button>

                  {(formData.branch || results) && (
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
              </CardContent>
            </Card>
          </section>

          {/* Error State */}
          {error && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <FiAlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">Plan Generation Failed</p>
                    <p className="text-sm text-muted-foreground mt-1">{error}</p>
                  </div>
                  <Button
                    onClick={handleGenerate}
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
                <h2 className="font-serif text-xl font-bold tracking-tight" style={{ letterSpacing: '-0.02em' }}>Your Study Plan</h2>
                <CopyButton text={generateFullPlanText()} label="Copy Full Plan" />
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <ScrollArea className="w-full">
                  <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0 gap-0 inline-flex min-w-max">
                    {TAB_CONFIG.map((tab) => {
                      const IconComp = tab.icon
                      return (
                        <TabsTrigger
                          key={tab.id}
                          value={tab.id}
                          className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-4 py-3 text-xs sm:text-sm gap-1.5 whitespace-nowrap"
                        >
                          <IconComp className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{tab.label}</span>
                        </TabsTrigger>
                      )
                    })}
                  </TabsList>
                </ScrollArea>

                <div className="mt-6">
                  <TabsContent value="timeline">
                    <TimelineTab data={displayResults} />
                  </TabsContent>

                  <TabsContent value="weekly">
                    <WeeklyTab data={displayResults} />
                  </TabsContent>

                  <TabsContent value="roadmap">
                    <RoadmapTab data={displayResults} />
                  </TabsContent>

                  <TabsContent value="mocks">
                    <MocksTab data={displayResults} />
                  </TabsContent>

                  <TabsContent value="metrics">
                    <MetricsTab data={displayResults} />
                  </TabsContent>

                  <TabsContent value="insights">
                    <InsightsTab data={displayResults} />
                  </TabsContent>

                  <TabsContent value="fullplan">
                    <FullPlanTab data={displayResults} fullText={generateFullPlanText()} />
                  </TabsContent>
                </div>
              </Tabs>
            </section>
          ) : (
            <section>
              <Card className="border-dashed">
                <CardContent className="py-16">
                  <div className="text-center">
                    <FiCalendar className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
                    <p className="text-base font-medium text-muted-foreground">Fill in your student profile to get started</p>
                    <p className="text-sm text-muted-foreground/70 mt-2 max-w-md mx-auto">Our AI strategist will create a personalized study plan covering timeline analysis, weekly schedules, monthly roadmaps, mock strategies, and performance metrics.</p>
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
