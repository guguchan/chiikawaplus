import { useEffect, useState } from 'react'
import type { ToastMessage } from '../types'

interface Props {
  messages: ToastMessage[]
  onRemove: (id: number) => void
}

export default function Toast({ messages, onRemove }: Props) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      display: 'flex', flexDirection: 'column', gap: 8,
      zIndex: 200, pointerEvents: 'none',
    }}>
      {messages.map(m => (
        <ToastItem key={m.id} message={m} onRemove={onRemove} />
      ))}
    </div>
  )
}

function ToastItem({ message, onRemove }: { message: ToastMessage; onRemove: (id: number) => void }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2200)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!visible) {
      const t = setTimeout(() => onRemove(message.id), 300)
      return () => clearTimeout(t)
    }
  }, [visible, message.id, onRemove])

  const isError = message.type === 'error'

  return (
    <div style={{
      pointerEvents: 'auto',
      background: isError ? '#3d0a09' : 'var(--ink)',
      color: '#fff',
      borderRadius: 'var(--radius-sm)',
      padding: '10px 16px',
      fontSize: 14,
      fontWeight: 500,
      boxShadow: 'var(--shadow-pop)',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(8px)',
      transition: 'opacity 0.3s, transform 0.3s',
      maxWidth: 300,
      borderLeft: `4px solid ${isError ? '#e74c3c' : 'var(--peach)'}`,
    }}>
      {message.text}
    </div>
  )
}
