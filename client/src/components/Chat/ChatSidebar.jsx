import React, { useMemo, useState } from 'react'

const StatusDot = ({ online, small = false }) => (
  <span className={`absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full border-2 border-[#0f172a] ${online ? 'bg-emerald-400' : 'bg-slate-500'} ${small ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} />
)

const Avatar = ({ friend, small = false }) => (
  <div className={`relative grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-400 via-indigo-500 to-violet-600 font-bold text-white shadow-lg shadow-sky-500/20 ${small ? 'h-9 w-9 text-[10px]' : 'h-11 w-11 text-xs'}`}>
    {friend.friendUserId.slice(0, 2).toUpperCase()}
    <StatusDot online={friend.isOnline} small={small} />
  </div>
)

export function ChatSidebar({ darkMode = true, mobileView, setMobileView, searchUserId, setSearchUserId, handleAddFriend, addContactInputRef, pendingRequests, handleAcceptFriend, sentRequests, acceptedFriends, selectedFriend, setSelectedFriend, unreadCounts = {}, focusAddFriendInput, currentUser, messages = [] }) {
  const [filter, setFilter] = useState('')
  const [showSidebarMenu, setShowSidebarMenu] = useState(false)

  const filteredFriends = useMemo(
    () => acceptedFriends.filter(friend => friend.friendUserId.toLowerCase().includes(filter.toLowerCase())),
    [acceptedFriends, filter]
  )

  const callHistory = useMemo(() => {
    return [...messages]
      .filter((message) => message.type === 'call-invite' || message.type === 'video-call')
      .map((message) => ({
        id: message.id,
        direction: message.senderId === currentUser?.id ? 'Outgoing' : 'Incoming',
        title: message.type === 'video-call' ? 'Video call' : 'Video call invite',
        status: message.metadata?.status || 'completed',
        time: new Date(message.createdAt).toLocaleString([], {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }),
        content: message.content || 'No summary'
      }))
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 12)
  }, [messages, currentUser])

  const pick = friend => {
    setSelectedFriend(friend)
    setMobileView('chat')
  }

  return (
    <aside className={`w-full shrink-0 flex-col overflow-hidden rounded-[28px] border border-slate-800 bg-[#111827] shadow-2xl shadow-slate-950/30 md:w-[340px] ${mobileView === 'sidebar' ? 'flex' : 'hidden md:flex'}`}>
      <div className="border-b border-slate-800/80 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-sky-400 via-indigo-500 to-violet-600 text-xs font-bold text-white shadow-lg shadow-indigo-500/25">
              {currentUser?.userId?.slice(0, 2).toUpperCase() || 'ME'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{currentUser?.userId || 'You'}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-medium text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Online
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-400" />
        </div>

        <label className="relative mt-4 block">
          <span className="pointer-events-none absolute left-3 top-3 text-sm text-slate-500">⌕</span>
          <input
            value={filter}
            onChange={event => setFilter(event.target.value)}
            placeholder="Search messages or users"
            className="w-full rounded-2xl border border-slate-700 bg-slate-900/80 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-500/60"
          />
        </label>
      </div>

      <form onSubmit={handleAddFriend} className="mx-3 mt-3 flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/70 p-2">
        <input
          ref={addContactInputRef}
          type="text"
          required
          value={searchUserId}
          onChange={event => setSearchUserId(event.target.value)}
          placeholder="Add by user ID"
          className="min-w-0 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-slate-500"
        />
        <button type="submit" className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-sky-400">Add</button>
      </form>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-2">
        {pendingRequests.length > 0 && (
          <section className="mb-3 px-1">
            <p className={`mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.2em] ${darkMode ? 'text-sky-300' : 'text-sky-600'}`}>Requests</p>
            {pendingRequests.map(request => (
              <div key={request.friendshipId} className={`mb-1 flex items-center justify-between rounded-2xl p-2.5 ${darkMode ? 'bg-sky-500/10' : 'bg-sky-100'}`}>
                <span className={`truncate text-xs font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>@{request.friendUserId}</span>
                <button onClick={() => handleAcceptFriend(request.friendshipId)} className="rounded-lg bg-sky-500 px-2 py-1 text-[10px] font-bold text-white">Accept</button>
              </div>
            ))}
          </section>
        )}

        {sentRequests.length > 0 && (
          <section className="mb-3 px-1">
            <p className={`mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.2em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Pending</p>
            {sentRequests.map(request => (
              <div key={request.friendshipId} className={`mb-1 rounded-2xl px-2.5 py-2 text-xs ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>
                @{request.friendUserId}
                <span className="float-right text-[10px]">Sent</span>
              </div>
            ))}
          </section>
        )}

        <section>
          <div className="mb-2 flex items-center justify-between px-3 pt-1">
            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Recent</p>
            <span className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{acceptedFriends.length}</span>
          </div>

          {filteredFriends.length ? (
            filteredFriends.map(friend => {
              const active = selectedFriend?.friendId === friend.friendId
              const unread = unreadCounts[friend.friendUserId.toLowerCase()]

              return (
                <button
                  key={friend.friendshipId}
                  onClick={() => pick(friend)}
                  className={`mb-1 flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition ${active ? (darkMode ? 'bg-slate-800 shadow-inner shadow-slate-950/50' : 'bg-slate-100 shadow-inner shadow-slate-200/60') : darkMode ? 'hover:bg-slate-800/70' : 'hover:bg-slate-100'}`}
                >
                  <Avatar friend={friend} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <b className={`truncate text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>@{friend.friendUserId}</b>
                      <em className={`not-italic text-[9px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>2:15 PM</em>
                    </span>
                    <span className={`mt-1 block truncate text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {friend.isOnline ? 'Available to connect' : 'Offline · secure P2P'}
                    </span>
                  </span>
                  {unread ? (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-sky-500 px-1 text-[9px] font-bold text-white">
                      {unread}
                    </span>
                  ) : null}
                </button>
              )
            })
          ) : (
            <div className={`mx-2 mt-5 rounded-[24px] border border-dashed p-5 text-center ${darkMode ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-slate-50'}`}>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-sky-500/10 text-xl text-sky-400">✦</div>
              <h3 className={`mt-3 text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Start a conversation</h3>
              <p className={`mt-1 text-[11px] leading-5 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Invite a peer using their ID and begin a private message exchange.</p>
              <button onClick={focusAddFriendInput} className="mt-4 rounded-xl border border-sky-500/30 px-3 py-2 text-[10px] font-bold text-sky-500 transition hover:bg-sky-500/10">Add contact</button>
            </div>
          )}
        </section>
      </div>
    </aside>
  )
}

