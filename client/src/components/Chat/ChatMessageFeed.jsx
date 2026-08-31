import React from 'react';
import { FileTransferOverlay } from './FileTransferOverlay';

function ArrowLeftIcon({ className = 'h-5 w-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

function VideoIcon({ className = 'h-5 w-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  )
}

function PhoneIcon({ className = 'h-5 w-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.864-1.04l-3.252-.465a1.125 1.125 0 0 1-.95-1.12v-1.74a1.125 1.125 0 0 0-.95-1.12l-3.252-.465A1.125 1.125 0 0 0 12 11.25V9.51a1.125 1.125 0 0 1 .95-1.12l3.252-.465A1.125 1.125 0 0 0 17.25 6.75v-1.37c0-.516-.352-.966-.865-1.04L13.133 3.87a1.125 1.125 0 0 0-1.12-.95H6.75c8.284 0 15 6.716 15 15Z" />
    </svg>
  )
}

function MoreVerticalIcon({ className = 'h-5 w-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
    </svg>
  )
}

function MessageCircleIcon({ className = 'h-5 w-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379L10.3 19.72a.75.75 0 0 0 1.075-.022l2.185-2.295c.594-.017 1.184-.043 1.77-.078 1.58-.092 2.707-1.488 2.707-3.087V5.11c0-1.6-1.127-2.994-2.707-3.227A48.567 48.567 0 0 0 12 1.5c-3.167 0-6.187.324-9.108.948-1.58.233-2.707 1.627-2.707 3.227V13.5ZM21 16.5a2.25 2.25 0 0 0 2.25-2.25V5.25m0 0a2.25 2.25 0 0 0-2.25-2.25m0 2.25v9a2.25 2.25 0 0 1-2.25 2.25H18" />
    </svg>
  )
}

export function ChatMessageFeed({
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
  return (
    <div
      className={`flex-grow flex flex-col bg-slate-950/65 backdrop-blur-xl border border-slate-900 rounded-[24px] overflow-hidden shadow-2xl min-h-0 ${mobileView === 'chat' ? 'flex' : 'hidden md:flex'
        }`}
    >
      {selectedFriend ? (
        <>
          {/* Chat Header */}
          <div className="px-5 py-3 border-b border-slate-900 flex justify-between items-center bg-slate-900/15">
            <div className="flex items-center gap-3">
              {/* Mobile Back Button */}
              <button
                onClick={() => setMobileView('sidebar')}
                className="md:hidden p-2 rounded-lg bg-slate-900 text-slate-400 active:scale-95 transition"
                title="Back to Messages"
              >
                <ArrowLeftIcon className="h-4.5 w-4.5" />
              </button>

              <div className="relative h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-650 to-purple-700 flex items-center justify-center font-black text-white text-[11px] tracking-tight">
                {selectedFriend.friendUserId.substring(0, 2).toLowerCase()}
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[2px] border-slate-950 ${selectedFriend.isOnline ? 'bg-emerald-500' : 'bg-slate-650'
                  }`} />
              </div>

              <div>
                <h3 className="text-xs font-extrabold text-white">@{selectedFriend.friendUserId.toLowerCase()}</h3>
                <span className="text-[9px] text-slate-550 font-black uppercase tracking-wider mt-0.5 block">
                  {selectedFriend.isOnline ? 'Active Now' : 'Offline'}
                </span>
              </div>
            </div>

            {/* Call Controls */}
            <div className="flex gap-2">
              <button
                onClick={() => sendCallInvite('Video connection request')}
                disabled={!selectedFriend.isOnline}
                title={selectedFriend.isOnline ? 'Initiate P2P Video Call' : 'User is offline'}
                className="p-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-400 border border-indigo-500/15 active:scale-95 transition disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <VideoIcon className="h-4.5 w-4.5" />
              </button>
              <button
                disabled
                title="Voice calling placeholder"
                className="p-2 rounded-xl bg-slate-900 text-slate-500 border border-slate-800 opacity-40 cursor-not-allowed"
              >
                <PhoneIcon className="h-4.5 w-4.5" />
              </button>
              <button
                title="More actions"
                className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 transition"
              >
                <MoreVerticalIcon className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div ref={messageFeedRef} className="flex-grow p-5 overflow-y-auto space-y-4 bg-slate-950/20 min-h-0">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <span className="text-xs font-bold italic">No messages exchanged yet. Type below to start chat.</span>
              </div>
            ) : (
              messages.map((m, index) => {
                const isMe = m.senderId === currentUser.id
                const prevMsg = index > 0 ? messages[index - 1] : null
                const isGrouped = prevMsg && prevMsg.senderId === m.senderId &&
                  (new Date(m.createdAt) - new Date(prevMsg.createdAt) < 3 * 60 * 1000)

                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isGrouped ? 'mt-1' : 'mt-4'} w-full`}>
                    {(m.type === 'file-invite' || m.type === 'file') && m.metadata ? (
                      <>
                        {!isMe && !isGrouped && (
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-2">
                            @{selectedFriend.friendUserId.toLowerCase()}
                          </span>
                        )}

                        <div className={`p-4 rounded-2xl max-w-[80%] text-xs leading-relaxed border shadow-md flex flex-col gap-2 ${isMe
                            ? 'bg-slate-900 border-indigo-500/30 text-slate-100 rounded-tr-none'
                            : 'bg-slate-900 border-slate-800 text-slate-100 rounded-tl-none'
                          }`}>
                          <div className="flex items-center gap-2">
                            <span className="text-xl">📁</span>
                            <div>
                              <p className="font-extrabold text-slate-100 truncate">{m.metadata.name}</p>
                              <p className="text-[10px] text-slate-550 font-bold">{formatSize(m.metadata.size)}</p>
                            </div>
                          </div>

                          {m.metadata.note && (
                            <p className="text-slate-400 italic bg-slate-950/40 p-2.5 rounded-xl border border-slate-950/50">
                              "{m.metadata.note}"
                            </p>
                          )}

                          <div className="mt-1 flex items-center justify-between gap-4 flex-wrap">
                            <span className={`text-[10px] uppercase font-black tracking-wider ${m.metadata.status === 'completed' ? 'text-emerald-400' :
                                m.metadata.status === 'failed' ? 'text-rose-400' :
                                  'text-indigo-400'
                              }`}>
                              {m.metadata.status === 'pending' && (isMe ? '📤 Invite Sent' : '📥 Incoming File')}
                              {m.metadata.status === 'accepted' && '⏳ Transferring...'}
                              {m.metadata.status === 'completed' && (isMe ? '✅ Sent' : '✅ Received')}
                              {m.metadata.status === 'failed' && '❌ Transfer Failed'}
                              {m.metadata.status === 'declined' && '🚫 Declined'}
                            </span>

                            <div className="flex gap-2">
                              {/* Accept / Decline – only for pending receiver */}
                              {!isMe && m.metadata.status === 'pending' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleDeclineInlineFileInvite(m.id, selectedFriend.friendUserId)}
                                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-500 font-extrabold transition active:scale-95 text-[10px]"
                                  >
                                    Decline
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAcceptInlineFileInvite(m.id, selectedFriend.friendUserId, m.metadata.name, m.metadata.size, m.metadata.note)}
                                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold transition active:scale-95 text-[10px]"
                                  >
                                    Accept
                                  </button>
                                </>
                              )}

                              {/* Download button – only for receiver after completed */}
                              {!isMe && m.metadata.status === 'completed' && m.metadata.downloadUrl && (
                                <a
                                  href={m.metadata.downloadUrl}
                                  download={m.metadata.name}
                                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-extrabold transition active:scale-95 text-[10px] flex items-center gap-1"
                                >
                                  ⬇ Download
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Hover timestamp */}
                          <span className={`block text-[7px] text-right font-bold uppercase tracking-widest mt-1 opacity-50`}>
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </>
                    ) : m.type === 'call-invite' ? (
                      <>
                        <div className={`p-4 rounded-2xl max-w-[80%] text-xs leading-relaxed border shadow-md flex flex-col gap-2 ${isMe
                            ? 'bg-slate-900 border-indigo-500/30 text-slate-100 rounded-tr-none'
                            : 'bg-slate-900 border-slate-800 text-slate-100 rounded-tl-none'
                          }`}>
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-indigo-400">📞 Video Call</span>
                            <span className="text-slate-300">{m.content}</span>
                          </div>

                          {!isMe && m.metadata.status === 'pending' && (
                            <div className="flex gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, metadata: { status: 'accepted' } } : msg))
                                  answerCall(selectedFriend.friendUserId)
                                }}
                                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold transition active:scale-95 text-[10px]"
                              >
                                Answer
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, metadata: { status: 'declined' } } : msg))
                                  wsRef.current.send(JSON.stringify({
                                    type: 'invite-response',
                                    targetUserId: selectedFriend.friendUserId.toLowerCase(),
                                    accepted: false
                                  }))
                                }}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-500 font-extrabold transition active:scale-95 text-[10px]"
                              >
                                Decline
                              </button>
                            </div>
                          )}
                          {m.metadata.status === 'accepted' && <span className="text-[10px] text-emerald-500 font-bold mt-1">Ongoing...</span>}
                          {m.metadata.status === 'declined' && <span className="text-[10px] text-rose-500 font-bold mt-1">Declined</span>}
                        </div>
                      </>
                    ) : m.type === 'video-call' ? (
                      <>
                        <div className={`p-4 rounded-2xl max-w-[80%] text-xs leading-relaxed border shadow-md flex flex-col gap-2 ${isMe
                            ? 'bg-slate-900 border-indigo-500/30 text-slate-100 rounded-tr-none'
                            : 'bg-slate-900 border-slate-800 text-slate-100 rounded-tl-none'
                          }`}>
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{m.metadata?.status === 'missed' ? '🚫' : '📞'}</span>
                            <div>
                              <p className="font-extrabold text-slate-100 truncate">{m.content}</p>
                            </div>
                          </div>
                          <span className={`block text-[7px] text-right font-bold uppercase tracking-widest mt-1 opacity-50`}>
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Show user ID label for incoming if not grouped */}
                        {!isMe && !isGrouped && (
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-2">
                            @{selectedFriend.friendUserId.toLowerCase()}
                          </span>
                        )}

                        <div className={`group relative max-w-[70%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${isMe
                            ? 'bg-gradient-to-tr from-indigo-600 to-purple-650 text-white rounded-tr-none'
                            : 'bg-slate-900 border border-slate-900/60 text-slate-200 rounded-tl-none'
                          }`}>
                          <p className="font-semibold select-text">{m.content}</p>

                          {/* Hover timestamp */}
                          <span className={`block text-[7px] text-right font-bold uppercase tracking-widest mt-1 opacity-50`}>
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* P2P File Transfer Progress overlay */}
          <FileTransferOverlay
            transferState={transferState}
            transferFileName={transferFileName}
            transferProgress={transferProgress}
            transferSpeed={transferSpeed}
            cancelFileTransfer={cancelFileTransfer}
            formatSpeed={formatSpeed}
          />

          {/* Selected File Badge */}
          {selectedFile && (
            <div className="mx-4 mb-2 p-2 rounded-xl bg-slate-900 border border-indigo-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-200">
                <span className="font-semibold">{selectedFile.name}</span>
                <span className="text-[10px] text-slate-500">({formatSize(selectedFile.size)})</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null)
                  if(currentFileRef) currentFileRef.current = null
                  if(fileInputRef && fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="text-rose-500 hover:text-rose-400 font-bold px-2 py-0.5 rounded-lg bg-slate-950/40"
              >
                Remove
              </button>
            </div>
          )}

          {/* Message Composer */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-900/80 bg-slate-950/40 flex gap-2 relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Attachment Popover Menu */}
            {showAttachmentMenu && (
              <div className="absolute bottom-16 left-4 w-48 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-2 flex flex-col gap-1 z-50 animate-slideUp">
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachmentMenu(false)
                    fileInputRef.current?.click()
                  }}
                  className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-slate-800 text-slate-300 transition text-sm font-semibold"
                >
                  📄 Document
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachmentMenu(false)
                    sendCallInvite('Video connection request')
                  }}
                  disabled={!selectedFriend.isOnline}
                  className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-slate-800 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-semibold"
                >
                  📹 Video Call
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              title="Attachments"
              className="px-3.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition active:scale-95 text-sm font-bold"
            >
              +
            </button>

            <input
              type="text"
              required={!selectedFile}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={selectedFile ? "Add a message or press Send to share file..." : "Write a secure message..."}
              className="flex-grow px-4 py-2.5 rounded-xl border border-slate-900 bg-slate-950/80 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition"
            />

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-650 text-white font-extrabold text-xs hover:shadow-lg hover:shadow-indigo-500/10 transition active:scale-95 flex items-center justify-center"
            >
              Send
            </button>
          </form>
        </>
      ) : (
        // Chat Center Empty State
        <div className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-slate-950/20">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 border border-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4 animate-pulse">
            <MessageCircleIcon className="h-6 w-6" />
          </div>
          <h2 className="text-base font-extrabold text-white tracking-tight">Start a conversation</h2>
          <p className="max-w-xs text-[11px] text-slate-500 leading-relaxed font-semibold mt-1.5 mb-5">
            Select a contact from the sidebar list to start exchanging direct messages and secure calls.
          </p>
          <button
            onClick={focusAddFriendInput}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold tracking-wider uppercase transition active:scale-95"
          >
            + Add a Contact
          </button>
        </div>
      )}
    </div>
  );
}
