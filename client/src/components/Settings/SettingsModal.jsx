import React, { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { UserAvatar } from '../UserAvatar'
import { authService } from '../../services/authService'

export function SettingsModal({ open, onClose, onProfileUpdated }) {
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const res = await authService.fetchAuth('/api/users/me')
        const data = await res.json()
        if (!cancelled && data.ok && data.user) {
          setEmail(data.user.email || '')
          setUsername(data.user.userId || '')
          setAvatarUrl(data.user.avatarUrl || null)
        }
      } catch {
        if (!cancelled) toast.error('Could not load settings.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [open])

  if (!open) return null

  const handleAvatarPick = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.')
      return
    }
    if (file.size > 200 * 1024) {
      toast.error('Image must be under 200 KB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setAvatarUrl(typeof reader.result === 'string' ? reader.result : null)
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const handleSaveProfile = async (event) => {
    event.preventDefault()
    setSavingProfile(true)
    try {
      const res = await authService.fetchAuth('/api/users/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ userId: username.trim(), avatarUrl }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Could not save profile.')
      }
      if (data.token) {
        authService.persistTokenFromSettings(data.token)
      }
      toast.success(data.message || 'Profile saved.')
      onProfileUpdated?.(data.user)
      window.dispatchEvent(new Event('auth-change'))
      if (data.usernameChanged) {
        toast('Username changed — reconnecting…', { icon: '↻' })
        window.location.reload()
        return
      }
    } catch (err) {
      toast.error(err.message || 'Could not save profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSavePassword = async (event) => {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.')
      return
    }
    setSavingPassword(true)
    try {
      const res = await authService.fetchAuth('/api/users/me/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Could not update password.')
      }
      toast.success('Password updated.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.error(err.message || 'Could not update password.')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <>
      <button type="button" className="fixed inset-0 z-[80] bg-black/50" aria-label="Close settings" onClick={onClose} />
      <div className="fixed inset-x-3 top-[max(1rem,env(safe-area-inset-top))] z-[81] mx-auto max-h-[min(90dvh,720px)] max-w-lg overflow-y-auto rounded-xl border border-chat-border bg-chat-sidebar shadow-2xl dark:border-chat-borderDark dark:bg-chat-headerDark sm:inset-x-auto sm:left-1/2 sm:w-full sm:-translate-x-1/2">
        <div className="sticky top-0 flex items-center justify-between border-b border-chat-border bg-chat-sidebar px-4 py-3 dark:border-chat-borderDark dark:bg-chat-headerDark">
          <h2 className="text-base font-semibold text-[#111b21] dark:text-[#e9edef]">Settings</h2>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-chat-muted hover:bg-black/5 dark:hover:bg-white/10">
            Close
          </button>
        </div>

        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-chat-muted">Loading…</p>
        ) : (
          <div className="space-y-6 p-4">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-chat-muted">Profile</p>
              <div className="flex items-center gap-4">
                <UserAvatar userId={username} avatarUrl={avatarUrl} size="md" />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg bg-chat-accent px-3 py-1.5 text-xs font-semibold text-white"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change photo
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-chat-muted hover:bg-black/5 dark:hover:bg-white/10"
                      onClick={() => setAvatarUrl(null)}
                    >
                      Remove
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
                </div>
              </div>

              <label className="block text-sm">
                <span className="mb-1 block text-chat-muted">Email</span>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full rounded-lg border border-chat-border bg-black/[0.03] px-3 py-2 text-sm dark:border-chat-borderDark dark:bg-white/[0.04]"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-chat-muted">Username</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  className="w-full rounded-lg border border-chat-border bg-transparent px-3 py-2 text-sm dark:border-chat-borderDark"
                  placeholder="your_username"
                />
                <span className="mt-1 block text-[11px] text-chat-muted">3–30 characters: letters, numbers, underscores.</span>
              </label>

              <button type="submit" disabled={savingProfile} className="primary-action w-full sm:w-auto">
                {savingProfile ? 'Saving…' : 'Save profile'}
              </button>
            </form>

            <form onSubmit={handleSavePassword} className="space-y-4 border-t border-chat-border pt-6 dark:border-chat-borderDark">
              <p className="text-xs font-semibold uppercase tracking-wide text-chat-muted">Password</p>
              <label className="block text-sm">
                <span className="mb-1 block text-chat-muted">Current password</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-chat-border bg-transparent px-3 py-2 text-sm dark:border-chat-borderDark"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-chat-muted">New password</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-chat-border bg-transparent px-3 py-2 text-sm dark:border-chat-borderDark"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-chat-muted">Confirm new password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-chat-border bg-transparent px-3 py-2 text-sm dark:border-chat-borderDark"
                />
              </label>
              <button type="submit" disabled={savingPassword} className="rounded-lg border border-chat-accent px-4 py-2 text-sm font-semibold text-chat-accent hover:bg-chat-accent/10 dark:text-chat-accentLight">
                {savingPassword ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  )
}
