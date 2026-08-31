import React from 'react';

// Icons used only in Sidebar
function MessageCircleIcon({ className = 'h-5 w-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379L10.3 19.72a.75.75 0 0 0 1.075-.022l2.185-2.295c.594-.017 1.184-.043 1.77-.078 1.58-.092 2.707-1.488 2.707-3.087V5.11c0-1.6-1.127-2.994-2.707-3.227A48.567 48.567 0 0 0 12 1.5c-3.167 0-6.187.324-9.108.948-1.58.233-2.707 1.627-2.707 3.227V13.5ZM21 16.5a2.25 2.25 0 0 0 2.25-2.25V5.25m0 0a2.25 2.25 0 0 0-2.25-2.25m0 2.25v9a2.25 2.25 0 0 1-2.25 2.25H18" />
    </svg>
  );
}

function PlusIcon({ className = 'h-4 w-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

export function ChatSidebar({
  mobileView,
  setMobileView,
  searchUserId,
  setSearchUserId,
  handleAddFriend,
  addContactInputRef,
  pendingRequests,
  handleAcceptFriend,
  sentRequests,
  acceptedFriends,
  selectedFriend,
  setSelectedFriend,
  unreadCounts = {},
  focusAddFriendInput
}) {
  return (
    <div 
      className={`w-full md:w-80 flex flex-col gap-4 bg-slate-950/65 backdrop-blur-xl border border-slate-900 rounded-[24px] p-5 shadow-2xl min-h-0 ${
        mobileView === 'sidebar' ? 'block' : 'hidden md:flex'
      }`}
    >
      {/* Sidebar Header */}
      <div className="flex flex-col">
        <h2 className="text-xl font-extrabold tracking-tight text-white">Messages</h2>
        <span className="text-[11px] font-semibold text-slate-500 mt-0.5">Your conversations</span>
      </div>

      {/* Add Friend Section */}
      <div className="bg-slate-900/35 border border-slate-900/60 p-3 rounded-2xl">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Add a contact</label>
        <form onSubmit={handleAddFriend} className="flex gap-2">
          <input
            ref={addContactInputRef}
            type="text"
            required
            value={searchUserId}
            onChange={(e) => setSearchUserId(e.target.value)}
            placeholder="User ID"
            className="flex-grow px-3 py-2 text-xs rounded-xl border border-slate-900 bg-slate-950/50 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500/80 transition"
          />
          <button
            type="submit"
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs active:scale-95 transition flex items-center justify-center h-8 w-8 shrink-0"
            title="Add Contact"
          >
            <PlusIcon />
          </button>
        </form>
      </div>

      {/* Pending Requests Block */}
      {pendingRequests.length > 0 && (
        <div className="flex flex-col gap-2 max-h-40 overflow-y-auto border-t border-slate-900/80 pt-3">
          <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Pending Requests</h3>
          {pendingRequests.map((r) => (
            <div key={r.friendshipId} className="flex justify-between items-center bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-2">
              <span className="text-xs font-bold text-slate-300 truncate pr-1">@{r.friendUserId.toLowerCase()}</span>
              <button
                onClick={() => handleAcceptFriend(r.friendshipId)}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-extrabold uppercase tracking-wider transition active:scale-95 shrink-0"
              >
                Accept
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Sent Requests Block */}
      {sentRequests.length > 0 && (
        <div className="flex flex-col gap-2 max-h-40 overflow-y-auto border-t border-slate-900/80 pt-3">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Sent Requests</h3>
          {sentRequests.map((r) => (
            <div key={r.friendshipId} className="flex justify-between items-center bg-slate-900/20 border border-slate-900/60 rounded-xl p-2">
              <span className="text-xs font-bold text-slate-400 truncate pr-1">@{r.friendUserId.toLowerCase()}</span>
              <span className="text-[8px] text-indigo-400 font-bold uppercase tracking-wider shrink-0 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/15">
                Pending
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Direct Contacts list */}
      <div className="flex-grow flex flex-col gap-1.5 overflow-y-auto border-t border-slate-900/80 pt-3 min-h-0">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Direct contacts</h3>
        
        {acceptedFriends.length === 0 ? (
          // Sidebar Empty State
          <div className="flex-grow flex flex-col items-center justify-center p-4 text-center mt-4">
            <div className="h-9 w-9 rounded-xl bg-slate-900/40 border border-slate-800/40 flex items-center justify-center text-slate-500 mb-2">
              <MessageCircleIcon className="h-4.5 w-4.5" />
            </div>
            <h4 className="text-xs font-extrabold text-slate-350">No conversations yet</h4>
            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed mt-1 mb-3">
              Add a contact using their User ID to start chatting securely.
            </p>
            <button
              onClick={focusAddFriendInput}
              className="px-3 py-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400 text-[10px] font-bold tracking-wider uppercase transition"
            >
              + Add Contact
            </button>
          </div>
        ) : (
          acceptedFriends.map((f) => {
            const active = selectedFriend?.friendId === f.friendId
            return (
              <button
                key={f.friendshipId}
                onClick={() => {
                  setSelectedFriend(f)
                  setMobileView('chat')
                }}
                className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition duration-200 text-left border ${
                  active
                    ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/20 text-indigo-400 font-bold'
                    : 'border-transparent text-slate-450 hover:bg-slate-900/25 hover:text-slate-200'
                }`}
              >
                {/* Custom Avatar with presence dot */}
                <div className="relative h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-650 to-purple-700 flex items-center justify-center font-black text-white text-[11px] tracking-tight shrink-0 shadow-md">
                  {f.friendUserId.substring(0, 2).toLowerCase()}
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[2px] border-slate-950 ${
                    f.isOnline ? 'bg-emerald-500' : 'bg-slate-600'
                  }`} />
                </div>
                
                <div className="flex-grow min-w-0">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-extrabold truncate">@{f.friendUserId.toLowerCase()}</span>
                    {unreadCounts[f.friendUserId.toLowerCase()] > 0 ? (
                      <span className="h-4 min-w-4 px-1.5 rounded-full bg-indigo-500 flex items-center justify-center text-[9px] font-black text-white shrink-0 shadow-lg shadow-indigo-500/20">
                        {unreadCounts[f.friendUserId.toLowerCase()]}
                      </span>
                    ) : (
                      <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider shrink-0">
                        {f.isOnline ? 'online' : 'offline'}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5 font-semibold">
                    Secure P2P tunnel active.
                  </p>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  );
}
