import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileTransferOverlay } from './FileTransferOverlay'

export function ChatMessageFeed({
  darkMode = true,
  selectedFriend,
  mobileView,
  setMobileView,
  sendCallInvite,
  messageFeedRef,
  messages,
  currentUser,
  formatSize,
  handleDeclineInlineFileInvite,
  handleAcceptInlineFileInvite,
  setMessages,
  answerCall,
  wsRef,
  chatEndRef,
  transferState,
  transferFileName,
  transferProgress,
  transferSpeed,
  cancelFileTransfer,
  formatSpeed,
  selectedFile,
  setSelectedFile,
  currentFileRef,
  handleSendMessage,
  fileInputRef,
  handleFileChange,
  showAttachmentMenu,
  setShowAttachmentMenu,
  messageText,
  setMessageText,
  focusAddFriendInput
}) {
  const [showMoreActions, setShowMoreActions] = React.useState(false)

  return (
    <div className={`flex min-h-0 flex-grow flex-col overflow-hidden rounded-[28px] border shadow-2xl ${darkMode ? 'border-slate-800 bg-[#0b1220] shadow-slate-950/25' : 'border-slate-200 bg-white shadow-slate-200/60'} ${mobileView === 'chat' ? 'flex' : 'hidden md:flex'}`}>
      <AnimatePresence mode="wait">
        {selectedFriend ? (
          <motion.div
            key={selectedFriend.friendId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <header className={`flex items-center justify-between border-b px-4 py-3 sm:px-5 ${darkMode ? 'border-slate-800 bg-[#111827]' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <button onClick={() => setMobileView('sidebar')} className={`md:hidden rounded-xl p-2 ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>←</button>
                <div className="relative grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-sky-400 via-indigo-500 to-violet-600 text-[11px] font-bold text-white">
                  {selectedFriend.friendUserId.slice(0, 2).toUpperCase()}
                  <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 ${darkMode ? 'border-[#111827]' : 'border-white'} ${selectedFriend.isOnline ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                </div>

                <div>
                  <h3 className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>@{selectedFriend.friendUserId}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.18em] ${selectedFriend.isOnline ? 'text-emerald-400' : 'text-slate-400'}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {selectedFriend.isOnline ? 'P2P Connected' : 'Peer Offline'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" onClick={() => sendCallInvite('Video connection request')} className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold transition ${darkMode ? 'bg-sky-500/10 text-sky-300 hover:bg-sky-500/20' : 'bg-sky-100 text-sky-600 hover:bg-sky-200'}`}>◉</button>
                <button type="button" className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold transition ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>☎</button>
                <div className="relative">
                  <button type="button" onClick={() => setShowMoreActions(prev => !prev)} className={`grid h-9 w-9 place-items-center rounded-full text-lg transition ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>⋯</button>
                  {showMoreActions && (
                    <div className={`absolute right-0 top-11 z-20 w-44 rounded-2xl border p-2 shadow-2xl ${darkMode ? 'border-slate-700 bg-[#0b1220] shadow-black/30' : 'border-slate-200 bg-white shadow-slate-200/80'}`}>
                      <button onClick={() => { setShowMoreActions(false); focusAddFriendInput(); }} className={`w-full rounded-xl px-2 py-2 text-left text-xs ${darkMode ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'}`}>Add contact</button>
                      <button onClick={() => { setShowMoreActions(false); setShowAttachmentMenu(prev => !prev); }} className={`w-full rounded-xl px-2 py-2 text-left text-xs ${darkMode ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'}`}>Share file</button>
                      <button onClick={() => { setShowMoreActions(false); setMessages([]); }} className={`w-full rounded-xl px-2 py-2 text-left text-xs ${darkMode ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'}`}>Clear chat</button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            <div ref={messageFeedRef} className={`min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5 ${darkMode ? 'bg-[#0b1220]' : 'bg-[#f5f8fc]'}`}>
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center">
                  <div className="max-w-sm">
                    <div className="mx-auto grid h-20 w-20 place-items-center rounded-[28px] border border-sky-500/30 bg-sky-500/10 text-3xl text-sky-400 shadow-lg shadow-sky-500/10">✦</div>
                    <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.3em] text-sky-400">PeerShare</p>
                    <h2 className={`mt-4 text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Start a secure conversation</h2>
                    <p className={`mt-3 text-sm leading-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Connect directly with your peer and exchange messages securely.</p>
                    <button onClick={focusAddFriendInput} className="mt-8 rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400">New Conversation</button>
                  </div>
                </div>
              ) : (
                messages.map((m, index) => {
                  const isMe = m.senderId === currentUser.id
                  const prevMsg = index > 0 ? messages[index - 1] : null
                  const isGrouped = prevMsg && prevMsg.senderId === m.senderId && (new Date(m.createdAt) - new Date(prevMsg.createdAt) < 180000)

                  return (
                    <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isGrouped ? 'mt-1' : 'mt-4'}`}>
                      {(m.type === 'file-invite' || m.type === 'file') && m.metadata ? (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`max-w-[80%] rounded-[22px] border p-4 text-xs ${isMe ? 'rounded-br-md border-sky-500/30 bg-sky-500/10 text-slate-100' : 'rounded-bl-md border-slate-700 bg-slate-900 text-slate-100'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-800 text-lg">📁</div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold text-white">{m.metadata.name}</p>
                              <p className="text-[10px] text-slate-400">{formatSize(m.metadata.size)}</p>
                            </div>
                          </div>

                          {m.metadata.note && <p className="mt-3 rounded-xl bg-slate-950/40 p-2 text-slate-300">“{m.metadata.note}”</p>}

                          <div className="mt-3 flex items-center justify-between gap-2">
                            <span className={`text-[10px] font-bold uppercase tracking-[0.18em] ${m.metadata.status === 'completed' ? 'text-emerald-400' : m.metadata.status === 'failed' ? 'text-rose-400' : 'text-sky-300'}`}>
                              {m.metadata.status === 'pending' ? (isMe ? 'Sent' : 'Incoming') : m.metadata.status}
                            </span>
                            {!isMe && m.metadata.status === 'pending' && (
                              <div className="flex gap-2">
                                <button onClick={() => handleDeclineInlineFileInvite(m.id, selectedFriend.friendUserId)} className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-300">Decline</button>
                                <button onClick={() => handleAcceptInlineFileInvite(m.id, selectedFriend.friendUserId, m.metadata.name, m.metadata.size, m.metadata.note)} className="rounded-lg bg-emerald-500 px-2 py-1 text-[10px] font-bold text-white">Accept</button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ) : m.type === 'call-invite' ? (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`max-w-[80%] rounded-[22px] border p-4 text-xs ${isMe ? 'rounded-br-md border-sky-500/30 bg-sky-500/10 text-slate-100' : 'rounded-bl-md border-slate-700 bg-slate-900 text-slate-100'}`}>
                          <p className="font-semibold text-white">📞 Video call</p>
                          <p className="mt-2 text-slate-300">{m.content}</p>
                          {!isMe && m.metadata.status === 'pending' && (
                            <div className="mt-3 flex gap-2">
                              <button onClick={() => { setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, metadata: { status: 'accepted' } } : msg)); answerCall(selectedFriend.friendUserId); }} className="rounded-full bg-emerald-500 px-3 py-1.5 text-[10px] font-bold text-white">Answer</button>
                              <button onClick={() => { setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, metadata: { status: 'declined' } } : msg)); wsRef.current.send(JSON.stringify({ type: 'invite-response', targetUserId: selectedFriend.friendUserId.toLowerCase(), accepted: false, messageId: m.id })); }} className="rounded-full bg-slate-800 px-3 py-1.5 text-[10px] font-bold text-slate-300">Decline</button>
                            </div>
                          )}
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`max-w-[75%] rounded-[22px] px-4 py-2.5 text-sm leading-relaxed ${isMe ? 'rounded-br-md bg-gradient-to-r from-sky-500 to-indigo-600 text-white' : 'rounded-bl-md border border-slate-700 bg-slate-900 text-slate-200'}`}
                        >
                          <p>{m.content}</p>
                          <div className="mt-1 flex items-center justify-end gap-1 text-[9px] opacity-75">
                            <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isMe && <span>✓</span>}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )
                })
              )}
              <div ref={chatEndRef} />
            </div>

            <FileTransferOverlay
              transferState={transferState}
              transferFileName={transferFileName}
              transferProgress={transferProgress}
              transferSpeed={transferSpeed}
              cancelFileTransfer={cancelFileTransfer}
              formatSpeed={formatSpeed}
            />

            {selectedFile && (
              <div className="mx-4 mb-2 flex items-center justify-between rounded-2xl border border-sky-500/30 bg-slate-900 p-2 text-xs text-slate-200">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{selectedFile.name}</p>
                  <p className="text-[10px] text-slate-400">{formatSize(selectedFile.size)}</p>
                </div>
                <button type="button" onClick={() => { setSelectedFile(null); if(currentFileRef) currentFileRef.current = null; if(fileInputRef && fileInputRef.current) fileInputRef.current.value = ''; }} className="ml-2 rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-bold text-rose-300">Remove</button>
              </div>
            )}

            <form onSubmit={handleSendMessage} className={`relative border-t p-3 sm:p-4 ${darkMode ? 'border-slate-800 bg-[#111827]' : 'border-slate-200 bg-slate-50'}`}>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

              {showAttachmentMenu && (
                <div className={`absolute bottom-20 left-4 z-20 w-48 rounded-2xl border p-2 shadow-2xl ${darkMode ? 'border-slate-700 bg-[#0b1220] shadow-black/30' : 'border-slate-200 bg-white shadow-slate-200/80'}`}>
                  <button type="button" onClick={() => { setShowAttachmentMenu(false); fileInputRef.current?.click(); }} className={`w-full rounded-xl px-2 py-2 text-left text-sm ${darkMode ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'}`}>📄 Document</button>
                  <button type="button" onClick={() => { setShowAttachmentMenu(false); sendCallInvite('Video connection request'); }} className={`w-full rounded-xl px-2 py-2 text-left text-sm ${darkMode ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'}`}>📹 Video call</button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShowAttachmentMenu(!showAttachmentMenu)} className={`grid h-10 w-10 place-items-center rounded-2xl text-lg transition ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>＋</button>
                <button type="button" className={`grid h-10 w-10 place-items-center rounded-2xl text-lg transition ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>☺</button>
                <input
                  type="text"
                  required={!selectedFile}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={selectedFile ? 'Add a message or press Send to share file...' : 'Write a message...'}
                  className={`min-w-0 flex-1 rounded-2xl border px-4 py-2.5 text-sm outline-none ${darkMode ? 'border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:border-sky-500' : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-sky-400'}`}
                />
                <button type="button" className={`grid h-10 w-10 place-items-center rounded-2xl text-lg transition ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>🎙</button>
                <button type="submit" disabled={!messageText.trim() && !selectedFile} className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 text-lg font-bold text-white shadow-lg shadow-sky-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">➤</button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={`flex min-h-0 flex-1 items-center justify-center p-8 ${darkMode ? 'bg-[#0b1220]' : 'bg-[#f5f8fc]'}`}
          >
            <div className="text-center">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-[28px] border border-sky-500/30 bg-sky-500/10 text-3xl text-sky-400 shadow-lg shadow-sky-500/10">✦</div>
              <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.3em] text-sky-400">PeerShare</p>
              <h2 className={`mt-4 text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Start a secure conversation</h2>
              <p className={`mt-3 text-sm leading-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Connect directly with your peer and exchange messages securely.</p>
              <button onClick={focusAddFriendInput} className="mt-8 rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400">New Conversation</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
