import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { clearMembers, refreshMembers, useMembers } from '../lib/members'
import { errorMessage, squareAvatar } from '../lib/utils'
import type { StreakRow } from '../types'
import Avatar from './Avatar'
import ProfileTabs, { ProfileInfo } from './ProfileTabs'

export default function Profile({ userId }: { userId: string }) {
  const me = useMembers().find((m) => m.id === userId)
  const [streaks, setStreaks] = useState<StreakRow[]>([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ username: '', bio: '', exercises: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.rpc('streaks').then(({ data }) => setStreaks(((data ?? []) as StreakRow[]).filter((r) => r.user_id === userId)))
  }, [userId])

  function startEditing() {
    if (!me) return
    setForm({
      username: me.username,
      bio: me.bio ?? '',
      exercises: me.exercises ?? '',
    })
    setError(null)
    setEditing(true)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    const username = form.username.trim()
    if (username.length < 2 || username.length > 20) return setError('O nome precisa ter de 2 a 20 caracteres.')
    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from('profiles')
      .update({
        username,
        bio: form.bio.trim() || null,
        exercises: form.exercises.trim() || null,
      })
      .eq('id', userId)
    setSaving(false)
    if (error) return setError(errorMessage(error))
    await refreshMembers()
    setEditing(false)
  }

  async function changeAvatar(file: File | undefined) {
    if (!file || !me) return
    setUploading(true)
    setError(null)
    const path = `${userId}/avatar/${Date.now()}.jpg`
    try {
      const blob = await squareAvatar(file)
      const up = await supabase.storage.from('provas').upload(path, blob, { contentType: 'image/jpeg' })
      if (up.error) throw up.error
      const { error } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', userId)
      if (error) {
        await supabase.storage.from('provas').remove([path])
        throw error
      }
      if (me.avatar_path) await supabase.storage.from('provas').remove([me.avatar_path])
      await refreshMembers()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function signOut() {
    clearMembers()
    await supabase.auth.signOut()
  }

  if (!me) return <div className="profile" />

  return (
    <div className="profile">
      <header className="page-head">
        <h1>
          <span aria-hidden>👤</span> Perfil
        </h1>
      </header>

      <section className="card profile-top">
        <button className="avatar-edit" onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Trocar foto de perfil">
          <Avatar name={me.username} url={me.avatar_url} size="xl" />
          <span className="avatar-badge">{uploading ? '…' : '📷'}</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => changeAvatar(e.target.files?.[0])} />
        <p className="profile-name">{me.username}</p>
        {me.bio ? <p className="profile-bio">{me.bio}</p> : !editing && <p className="muted small">Sem descrição ainda</p>}
        <ProfileInfo member={me} streaks={streaks} />
        {!editing && (
          <div className="profile-actions">
            <button className="btn ghost small-btn" onClick={startEditing}>
              Editar perfil
            </button>
            <button className="btn ghost small-btn" onClick={signOut}>
              Sair
            </button>
          </div>
        )}
      </section>

      {error && <p className="msg error">{error}</p>}

      {editing ? (
        <form className="card edit-form" onSubmit={save}>
          <label>
            Nome no grupo
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} maxLength={20} required />
          </label>
          <label>
            Sobre você
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              maxLength={160}
              rows={3}
              placeholder="Uma frase sobre você ou sua meta"
            />
            <span className="counter">{form.bio.length}/160</span>
          </label>
          <label>
            🏋️ Exercícios que você faz
            <input
              value={form.exercises}
              onChange={(e) => setForm({ ...form, exercises: e.target.value })}
              maxLength={200}
              placeholder="ex: musculação, corrida, jiu-jitsu"
            />
          </label>
          <div className="row">
            <button type="button" className="btn ghost" onClick={() => setEditing(false)} disabled={saving}>
              Cancelar
            </button>
            <button className="btn primary" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      ) : (
        <ProfileTabs member={me} viewerId={userId} />
      )}
    </div>
  )
}
