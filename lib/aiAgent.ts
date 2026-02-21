'use client'

/**
 * AI Agent Client Utility
 *
 * Client-side wrapper for calling the AI Agent API route.
 * API keys are kept secure on the server.
 *
 * @example
 * ```tsx
 * import { callAIAgent } from '@/lib/aiAgent'
 *
 * const result = await callAIAgent('Hello!', 'agent-id')
 * if (result.success) {
 *   console.log(result.response.result)
 * }
 * ```
 */

import { useState } from 'react'
import fetchWrapper from '@/lib/fetchWrapper'

// Types
export interface NormalizedAgentResponse {
  status: 'success' | 'error'
  result: Record<string, any>
  message?: string
  metadata?: {
    agent_name?: string
    timestamp?: string
    [key: string]: any
  }
}

export interface ArtifactFile {
  file_url: string
  name: string
  format_type: string
}

export interface ModuleOutputs {
  artifact_files?: ArtifactFile[]
  [key: string]: any
}

export interface AIAgentResponse {
  success: boolean
  response: NormalizedAgentResponse
  module_outputs?: ModuleOutputs
  agent_id?: string
  user_id?: string
  session_id?: string
  timestamp?: string
  raw_response?: string
  error?: string
  details?: string
}

export interface UploadedFile {
  asset_id: string
  file_name: string
  success: boolean
  error?: string
}

export interface UploadResponse {
  success: boolean
  asset_ids: string[]
  files: UploadedFile[]
  total_files: number
  successful_uploads: number
  failed_uploads: number
  message: string
  timestamp: string
  error?: string
}

const POLL_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Call the AI Agent via server-side API route.
 * Submits an async task then polls from the client until completion.
 */
export async function callAIAgent(
  message: string,
  agent_id: string,
  options?: { user_id?: string; session_id?: string; assets?: string[] }
): Promise<AIAgentResponse> {
  try {
    // 1. Submit task — returns { task_id, agent_id, user_id, session_id }
    const submitRes = await fetchWrapper('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        agent_id,
        user_id: options?.user_id,
        session_id: options?.session_id,
        assets: options?.assets,
      }),
    })

    if (!submitRes) {
      return {
        success: false,
        response: { status: 'error', result: {}, message: 'No response from server' },
        error: 'No response from server',
      }
    }

    const submitData = await submitRes.json()

    // If submit itself failed or no task_id returned, return as-is
    if (!submitData.task_id) {
      return submitData.success === false
        ? submitData
        : {
            success: false,
            response: { status: 'error', result: {}, message: 'No task_id in response' },
            error: 'No task_id in response',
          }
    }

    const { task_id, user_id, session_id } = submitData

    // 2. Poll POST /api/agent with { task_id } — conservative backoff from CSR
    //    Wait 6s before first poll (agent needs time to process complex requests).
    //    Use slow exponential backoff with jitter, capped at 10s between polls.
    //    On 429, wait 15s minimum before retrying.
    const startTime = Date.now()
    let attempt = 0
    let consecutive429s = 0

    // Initial delay — give the agent time to start processing
    await new Promise(r => setTimeout(r, 6000))

    while (Date.now() - startTime < POLL_TIMEOUT_MS) {
      attempt++

      let pollRes: Response | undefined
      try {
        pollRes = await fetchWrapper('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_id }),
        })
      } catch {
        // Network error — wait 8s and retry
        await new Promise(r => setTimeout(r, 8000))
        continue
      }
      if (!pollRes) {
        await new Promise(r => setTimeout(r, 5000))
        continue // fetchWrapper returned undefined (redirect/error) — retry next poll
      }

      // Handle 429 rate limit: wait significantly longer before retrying
      if (pollRes.status === 429) {
        consecutive429s++
        const retryAfter = pollRes.headers.get('Retry-After')
        const baseWait = retryAfter ? parseInt(retryAfter, 10) * 1000 : 15000
        // Escalate wait time with each consecutive 429
        const waitMs = Math.min(baseWait * consecutive429s, 30000)
        await new Promise(r => setTimeout(r, waitMs))
        continue
      }

      consecutive429s = 0 // Reset on successful response

      let pollData: any
      try {
        pollData = await pollRes.json()
      } catch {
        // JSON parse error — wait and retry
        await new Promise(r => setTimeout(r, 5000))
        continue
      }

      if (pollData.status === 'processing') {
        // Adaptive backoff: start at 4s, grow to 10s max, with small random jitter
        const jitter = Math.random() * 1000
        const delay = Math.min(4000 * Math.pow(1.2, attempt - 1), 10000) + jitter
        await new Promise(r => setTimeout(r, delay))
        continue
      }

      // Completed or failed — attach agent_id/user_id/session_id and return
      return {
        ...pollData,
        agent_id,
        user_id,
        session_id,
      }
    }

    // Timed out
    return {
      success: false,
      response: {
        status: 'error',
        result: {},
        message: 'Agent task timed out after 5 minutes',
      },
      error: 'Agent task timed out after 5 minutes',
    }
  } catch (error) {
    return {
      success: false,
      response: {
        status: 'error',
        result: {},
        message: error instanceof Error ? error.message : 'Network error',
      },
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

/**
 * Upload files via server-side API route
 */
export async function uploadFiles(files: File | File[]): Promise<UploadResponse> {
  const fileArray = Array.isArray(files) ? files : [files]

  if (fileArray.length === 0) {
    return {
      success: false,
      asset_ids: [],
      files: [],
      total_files: 0,
      successful_uploads: 0,
      failed_uploads: 0,
      message: 'No files provided',
      timestamp: new Date().toISOString(),
      error: 'No files provided',
    }
  }

  try {
    const formData = new FormData()
    for (const file of fileArray) {
      formData.append('files', file, file.name)
    }

    const response = await fetchWrapper('/api/upload', {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()
    return data
  } catch (error) {
    return {
      success: false,
      asset_ids: [],
      files: [],
      total_files: fileArray.length,
      successful_uploads: 0,
      failed_uploads: fileArray.length,
      message: 'Network error during upload',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * React hook for using AI Agent in components
 */
export function useAIAgent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<NormalizedAgentResponse | null>(null)

  const callAgent = async (
    message: string,
    agent_id: string,
    options?: { user_id?: string; session_id?: string; assets?: string[] }
  ) => {
    setLoading(true)
    setError(null)
    setResponse(null)

    const result = await callAIAgent(message, agent_id, options)

    if (result.success) {
      setResponse(result.response)
    } else {
      setError(result.error || 'Unknown error')
      setResponse(result.response)
    }

    setLoading(false)
    return result
  }

  return {
    callAgent,
    loading,
    error,
    response,
  }
}

/**
 * React hook for file uploads
 */
export function useFileUpload() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<UploadResponse | null>(null)

  const upload = async (files: File | File[]) => {
    setUploading(true)
    setError(null)
    setResult(null)

    const uploadResult = await uploadFiles(files)

    if (uploadResult.success) {
      setResult(uploadResult)
    } else {
      setError(uploadResult.error || 'Upload failed')
      setResult(uploadResult)
    }

    setUploading(false)
    return uploadResult
  }

  return {
    upload,
    uploading,
    error,
    result,
  }
}

/**
 * Extract text from agent response
 */
export function extractText(response: NormalizedAgentResponse): string {
  if (response.message) return response.message
  if (response.result?.text) return response.result.text
  if (response.result?.message) return response.result.message
  if (response.result?.response) return response.result.response
  if (response.result?.answer) return response.result.answer
  if (response.result?.answer_text) return response.result.answer_text
  if (response.result?.summary) return response.result.summary
  if (response.result?.content) return response.result.content
  if (typeof response.result === 'string') return response.result
  return ''
}
