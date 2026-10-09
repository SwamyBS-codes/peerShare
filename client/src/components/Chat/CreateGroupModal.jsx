import React, { useMemo, useState } from 'react'
import { IconClose, IconUsers } from '../icons/MessageIcons'

export function CreateGroupModal({ open, onClose, acceptedFriends, onCreate, creating }) {
  const [name, setName] = useState('')
  const [selected, setSelected] = useState(() => new Set())

  const friends = useMemo(
    () => acceptedFriends.filter((f) => f.friendUserId),
    [acceptedFriends],
  )

  if (!open) return null

  const toggleMember = (handle) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(handle)) next.delete(handle)
      else next.add(handle)
      return next
    })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim() || selected.size < 1) return
    await onCreate(name.trim(), [...selected])
  }

  return (
    <>
      <button type="button" className="fixed inset-0 z-50 bg-black/50" aria-label="Close" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-[51] flex max-h-[min(90vh,520px)] w-[min(92vw,400px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-chat-border bg-chat-sidebar shadow-2xl dark:border-chat-borderDark dark:bg-chat-headerDark">
        <header className="flex items-center justify-between border-b border-chat-border px-4 py-3 dark:border-chat-borderDark">
          <div className="flex items-center gap-2">
            <IconUsers className="h-5 w-5 text-chat-accent" />
            <h2 className="text-base font-medium text-[#111b21] dark:text-[#e9edef]">New group</h2>
          </div>
          <button type="button" onClick={onClose} className="icon-btn !h-8 !w-8" aria-label="Close">
            <IconClose className="h-4 w-4" />
          </button>
        </header>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 px-4 pt-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name"
              maxLength={80}
              required
              className="field-control w-full !rounded-lg"
            />
          </div>

          <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-chat-muted dark:text-chat-mutedDark">
            Members
          </p>
          <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {friends.length ? (
              friends.map((friend) => {
                const handle = friend.friendUserId.toLowerCase()
                const checked = selected.has(handle)
                return (
                  <li key={friend.friendshipId}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMember(handle)}
                        className="h-4 w-4 rounded border-chat-border text-chat-accent focus:ring-chat-accent"
                      />
                      <span className="truncate text-sm text-[#111b21] dark:text-[#e9edef]">@{friend.friendUserId}</span>
                    </label>
                  </li>
                )
              })
            ) : (
              <li className="px-4 py-6 text-center text-sm text-chat-muted dark:text-chat-mutedDark">
                Add friends first, then create a group.
              </li>
            )}
          </ul>

          <div className="flex shrink-0 gap-2 border-t border-chat-border p-4 dark:border-chat-borderDark">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg py-2.5 text-sm font-medium text-chat-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !name.trim() || selected.size < 1}
              className="primary-action flex-1 !py-2.5 disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create group'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
