'use client'

import { useState, useEffect } from 'react'

type Props = {
  lastSync: { synced_at: string; status: string } | null
}

export default function SyncButton({ lastSync }: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [lastSyncText, setLastSyncText] = useState('동기화 기록 없음')

  useEffect(() => {
    if (!lastSync) return
    const d = new Date(lastSync.synced_at)
    const text = `마지막 동기화: ${d.toLocaleString('ko-KR')} (${lastSync.status === 'success' ? '성공' : '실패'})`
    setLastSyncText(text)
  }, [lastSync])

  async function handleSync() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/sync-sheets', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setResult({ ok: true, msg: `동기화 완료 (${data.rows_upserted}행)` })
      } else {
        setResult({ ok: false, msg: data.error ?? '오류 발생' })
      }
    } catch {
      setResult({ ok: false, msg: '네트워크 오류' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-gray-400">{lastSyncText}</span>
      {result && (
        <span className={result.ok ? 'text-green-400' : 'text-red-400'}>{result.msg}</span>
      )}
      <button
        onClick={handleSync}
        disabled={loading}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {loading ? '동기화 중…' : '시트 동기화'}
      </button>
    </div>
  )
}
