import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { clearMembers, refreshMembers, useMembers } from '../lib/members'
import { compressImage, errorMessage, squareAvatar } from '../lib/utils'
import type { StreakRow } from '../types'
import Avatar from './Avatar'
import FeedList from './FeedList'
import ProfileDetails from './ProfileDetails'
import ProfileTabs from './ProfileTabs'
import { Camera, ImagePlus, Trash2 } from 'lucide-react'
import ProfileHero from './ProfileHero'
import TopBar from './TopBar'
import { SkeletonBlock, SkeletonCard } from './Skeleton'

export default function Profile({ userId }: { userId: string }) {
  const me = useMembers().find((m) => m.id === userId)
  const [streaks, setStreaks] = useState<StreakRow[]>([])
  const [total, setTotal] = useState(0)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ username: '', bio: '', exercises: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const coverRef = useRef<HTMLInputElement>(null)
  const [coverBusy, setCoverBusy] = useState(false)

  useEffect(() => {
    supabase.rpc('streaks').then(({ data }) => setStreaks(((data ?? []) as StreakRow[]).filter((r) => r.user_id === userId)))
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .then(({ count }) => setTotal(count ?? 0))
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

  async function changeCover(file: File | undefined) {
    if (!file || !me) return
    setCoverBusy(true)
    setError(null)
    const path = `${userId}/capa/${Date.now()}.jpg`
    try {
      const blob = await compressImage(file, 1280, 0.78)
      const up = await supabase.storage.from('provas').upload(path, blob, { contentType: 'image/jpeg' })
      if (up.error) throw up.error
      const { error } = await supabase.from('profiles').update({ cover_path: path }).eq('id', userId)
      if (error) {
        await supabase.storage.from('provas').remove([path])
        throw error
      }
      if (me.cover_path) await supabase.storage.from('provas').remove([me.cover_path])
      await refreshMembers()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setCoverBusy(false)
      if (coverRef.current) coverRef.current.value = ''
    }
  }

  async function removeCover() {
    if (!me?.cover_path) return
    setCoverBusy(true)
    setError(null)
    const { error } = await supabase.from('profiles').update({ cover_path: null }).eq('id', userId)
    if (error) setError(errorMessage(error))
    else {
      await supabase.storage.from('provas').remove([me.cover_path])
      await refreshMembers()
    }
    setCoverBusy(false)
  }

  async function signOut() {
    clearMembers()
    await supabase.auth.signOut()
  }

  if (!me)
    return (
      <div className="profile">
        <TopBar title="Perfil" />
        <div className="profile-top profile-head">
          <SkeletonBlock width={96} height={96} radius={48} />
          <SkeletonBlock width={140} height={22} />
          <SkeletonBlock width={200} height={14} />
        </div>
        <SkeletonCard height={160} />
      </div>
    )

  return (
    <div className="profile">
      <TopBar title="Perfil" />

      <ProfileHero
        coverUrl={me.cover_url}
        corner={
          <button className="hero-btn" onClick={() => coverRef.current?.click()} disabled={coverBusy} aria-label="Trocar plano de fundo">
            {coverBusy ? '…' : <ImagePlus size={17} aria-hidden />}
          </button>
        }
      >
        <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => changeCover(e.target.files?.[0])} />
        <button className="avatar-edit" onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Trocar foto de perfil">
          <Avatar name={me.username} url={me.avatar_url} size="xl" />
          <span className="avatar-badge">{uploading ? '…' : <Camera size={15} aria-hidden />}</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => changeAvatar(e.target.files?.[0])} />
        <p className="profile-name">{me.username}</p>
        {me.bio ? <p className="profile-bio">{me.bio}</p> : !editing && <p className="muted small">Sem descrição ainda</p>}
        <p className="muted small">
          {total} {total === 1 ? 'prova postada' : 'provas postadas'}
        </p>
        {!editing && (
          <button className="btn ghost" onClick={startEditing}>
            Editar perfil
          </button>
        )}
      </ProfileHero>

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
            Exercícios que você faz
            <input
              value={form.exercises}
              onChange={(e) => setForm({ ...form, exercises: e.target.value })}
              maxLength={200}
              placeholder="ex: musculação, corrida, jiu-jitsu"
            />
          </label>
          <div className="cover-field">
            <span>Plano de fundo</span>
            <div className="row">
              <button type="button" className="btn ghost" onClick={() => coverRef.current?.click()} disabled={coverBusy}>
                <ImagePlus size={16} aria-hidden /> {me.cover_path ? 'Trocar' : 'Escolher imagem'}
              </button>
              {me.cover_path && (
                <button type="button" className="btn ghost" onClick={removeCover} disabled={coverBusy}>
                  <Trash2 size={16} aria-hidden /> Remover
                </button>
              )}
            </div>
          </div>
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
        <ProfileTabs member={me} viewerId={userId}>
          <ProfileDetails member={me} streaks={streaks} />
          <h2 className="section-title">Seus posts das últimas 24h</h2>
          <FeedList userId={userId} authorId={userId} emptyText="Você não postou nada no feed hoje." />
        </ProfileTabs>
      )}

      <button className="btn ghost full" onClick={signOut}>
        Sair da conta
      </button>
    </div>
  )
}
