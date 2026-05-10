import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      // onAuthStateChange in App will handle the session update
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '登入失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100dvh', background: 'var(--surface)',
    }}>
      <div style={{
        background: 'var(--card)', borderRadius: 'var(--radius)',
        border: '1px solid var(--line-soft)', boxShadow: 'var(--shadow-pop)',
        padding: '40px 32px', width: '100%', maxWidth: 380,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8, animation: 'drift 3s ease-in-out infinite' }}>🧸</div>
          <h1 style={{ fontFamily: 'var(--font-title)', fontSize: 22, color: 'var(--ink)' }}>吉伊卡哇收藏紀錄</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>請登入以繼續</p>
        </div>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="field-label">電子信箱</label>
            <input
              type="email"
              className="field-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="field-label">密碼</label>
            <input
              type="password"
              className="field-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {error && (
            <div style={{
              color: '#c0392b', fontSize: 13,
              padding: '8px 12px', background: '#fdf0f0', borderRadius: 6,
            }}>
              {error}
            </div>
          )}
          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? '登入中…' : '登入'}
          </button>
        </form>
      </div>
    </div>
  )
}
