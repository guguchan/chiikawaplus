import { useState, useEffect, useCallback, useRef } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import type { BadgeTheme, BadgeCharacter, Doll, DollCharacter, ToastMessage } from './types'
import Header from './components/Header'
import BadgesTab from './components/BadgesTab'
import DollsTab from './components/DollsTab'
import Toast from './components/Toast'
import LoginPage from './components/LoginPage'

type Tab = 'badges' | 'dolls'

export default function App() {
  const [tab, setTab] = useState<Tab>('badges')
  const [badges, setBadges] = useState<BadgeTheme[]>([])
  const [badgeChars, setBadgeChars] = useState<BadgeCharacter[]>([])
  const [dolls, setDolls] = useState<Doll[]>([])
  const [dollChars, setDollChars] = useState<DollCharacter[]>([])
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [session, setSession] = useState<Session | null>(null)
  const loadedUserRef = useRef<string | null>(null)

  const toast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now()
    setToasts(p => [...p, { id, text, type }])
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(p => p.filter(t => t.id !== id))
  }, [])

  // ── Badge loaders ──────────────────────────────────────────────────────────
  const loadBadgeChars = useCallback(async () => {
    const { data, error } = await supabase.from('badge_characters').select('*').order('sort_order')
    if (error) { toast(`載入角色失敗：${error.message}`, 'error'); return }
    if (data) setBadgeChars(data)
  }, [toast])

  const loadBadges = useCallback(async () => {
    const [charsResult, themesResult] = await Promise.all([
      supabase.from('badge_characters').select('*').order('sort_order'),
      supabase.from('badge_themes')
        .select('id, location_name, theme_name, region, japanese_name, created_at, badge_ownership(*, badge_characters(*))')
        .order('id'),
    ])
    if (charsResult.error) { toast(`載入失敗：${charsResult.error.message}`, 'error'); return }
    if (themesResult.error) { toast(`載入失敗：${themesResult.error.message}`, 'error'); return }
    if (charsResult.data) setBadgeChars(charsResult.data)
    if (themesResult.data) setBadges(themesResult.data as unknown as BadgeTheme[])
  }, [toast])

  // ── Doll loaders ───────────────────────────────────────────────────────────
  const loadDollChars = useCallback(async () => {
    const { data, error } = await supabase.from('doll_characters').select('*').order('sort_order')
    if (error) { toast(`載入角色失敗：${error.message}`, 'error'); return }
    if (data) setDollChars(data)
  }, [toast])

  const loadDolls = useCallback(async () => {
    const [charsResult, dollsResult] = await Promise.all([
      supabase.from('doll_characters').select('*').order('sort_order'),
      // Exclude photo_base64 — DollsTab lazy-fetches images per visible doll
      supabase.from('dolls')
        .select('id, character_id, acquired_date, notes, created_at, doll_characters(*)')
        .order('created_at', { ascending: false }),
    ])
    if (charsResult.error) { toast(`載入失敗：${charsResult.error.message}`, 'error'); return }
    if (dollsResult.error) { toast(`載入失敗：${dollsResult.error.message}`, 'error'); return }
    if (charsResult.data) setDollChars(charsResult.data)
    if (dollsResult.data) setDolls(dollsResult.data as unknown as Doll[])
  }, [toast])

  // ── Auth + initial load ────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session)
        if (session) {
          loadedUserRef.current = session.user.id
          Promise.all([loadBadges(), loadDolls()]).finally(() => setLoading(false))
        } else {
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      // Only reload data when a new user signs in (not on token refresh)
      if (newSession && loadedUserRef.current !== newSession.user.id) {
        loadedUserRef.current = newSession.user.id
        setLoading(true)
        Promise.all([loadBadges(), loadDolls()]).finally(() => setLoading(false))
      }
      if (!newSession) {
        loadedUserRef.current = null
        setBadges([])
        setDolls([])
      }
    })

    return () => subscription.unsubscribe()
  }, [loadBadges, loadDolls])

  // ── Logout ─────────────────────────────────────────────────────────────────
  async function handleLogout() {
    await supabase.auth.signOut()
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', flexDirection: 'column', gap: 16 }}>
        <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        <div style={{ color: 'var(--ink-soft)', fontSize: 14 }}>載入中…</div>
      </div>
    )
  }

  if (!session) {
    return <LoginPage />
  }

  return (
    <>
      <Header badges={badges} badgeChars={badgeChars} dolls={dolls} onLogout={handleLogout} />

      {/* Tab bar */}
      <div style={{ background: 'var(--surface)', borderBottom: '1.5px solid var(--line)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="container">
          <div style={{ display: 'flex', gap: 0 }}>
            {(['badges', 'dolls'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '14px 24px',
                  fontFamily: 'var(--font-body)',
                  fontSize: 14, fontWeight: 700,
                  color: tab === t ? 'var(--peach)' : 'var(--muted)',
                  borderBottom: tab === t ? '2.5px solid var(--peach)' : '2.5px solid transparent',
                  transition: 'all 0.15s',
                  background: 'none',
                  cursor: 'pointer',
                  marginBottom: -1.5,
                }}
              >
                {t === 'badges' ? '🏷 鐵牌' : '🪆 娃娃'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container" style={{ paddingTop: 8, paddingBottom: 40 }}>
        {tab === 'badges' && (
          <BadgesTab
            badges={badges}
            characters={badgeChars}
            onRefresh={loadBadges}
            onRefreshChars={loadBadgeChars}
            onToast={toast}
          />
        )}
        {tab === 'dolls' && (
          <DollsTab
            dolls={dolls}
            characters={dollChars}
            onRefresh={loadDolls}
            onRefreshChars={loadDollChars}
            onToast={toast}
          />
        )}
      </main>

      <Toast messages={toasts} onRemove={removeToast} />
    </>
  )
}
