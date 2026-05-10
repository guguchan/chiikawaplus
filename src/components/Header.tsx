import type { BadgeTheme, BadgeCharacter, Doll } from '../types'

interface Props {
  badges: BadgeTheme[]
  badgeChars: BadgeCharacter[]
  dolls: Doll[]
  onLogout: () => void
}

export default function Header({ badges, badgeChars, dolls, onLogout }: Props) {
  const stats = badgeChars.map(c => {
    const owned = badges.filter(b =>
      b.badge_ownership?.some(o => o.character_id === c.id && o.owned)
    ).length
    return { name: c.name, owned, total: badges.length }
  })

  return (
    <header style={{
      background: 'var(--surface)',
      borderBottom: '1.5px solid var(--line)',
      paddingBottom: 20,
      marginBottom: 0,
    }}>
      <div className="container">
        <div style={{ paddingTop: 28, paddingBottom: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.2em',
              color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6,
            }}>
              CHIIKAWAPLUS · 收藏紀錄
            </div>
            <h1 style={{
              fontFamily: 'var(--font-title)', fontSize: 'clamp(28px,5vw,44px)',
              fontWeight: 700, color: 'var(--ink)', letterSpacing: '0.04em', lineHeight: 1.1,
            }}>
              吉伊卡哇收藏
            </h1>
            <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 6 }}>
              紀錄你的鐵牌與娃娃
            </p>
          </div>
          <button
            className="btn-ghost"
            style={{ fontSize: 12, padding: '10px 14px', marginTop: 4, flexShrink: 0, minHeight: 44 }}
            onClick={onLogout}
          >
            登出
          </button>
        </div>

        {/* Stats chips */}
        <div style={{
          display: 'flex', gap: 10, marginTop: 18,
          overflowX: 'auto', paddingBottom: 4,
        }}>
          <StatChip label="鐵牌主題" value={badges.length} unit="款" />
          {stats.map(s => (
            <StatChip key={s.name} label={`${s.name} 鐵牌`} value={s.owned} unit={`/${s.total}`} />
          ))}
          <StatChip label="娃娃" value={dolls.length} unit="隻" />
        </div>
      </div>
    </header>
  )
}

function StatChip({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div style={{
      background: 'var(--cream-deep)',
      border: '1.5px solid var(--line)',
      borderRadius: 20,
      padding: '6px 14px',
      display: 'flex', alignItems: 'baseline', gap: 4,
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--peach)', fontFamily: 'var(--font-title)' }}>
        {value}
      </span>
      <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{unit}</span>
    </div>
  )
}
