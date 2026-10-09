import React from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import EmojiPicker from 'emoji-picker-react'
import { FileTransferOverlay } from './FileTransferOverlay'
import { MessageMetaRow } from './MessageStatusTicks'
import { EmptyChatPane } from './EmptyChatPane'
import { UserAvatar } from '../UserAvatar'
import {
  IconAttach,
  IconBack,
  IconFile,
  IconLock,
  IconMic,
  IconMore,
  IconPhone,
  IconSend,
  IconSmile,
  IconUsers,
  IconVideo,
} from '../icons/MessageIcons'

export function ChatMessageFeed({
  darkMode = true,
  selectedFriend,
  selectedGroup,
  startGroupCall,
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
  handleSendVoiceNote,
  fileInputRef,
  handleFileChange,
  showAttachmentMenu,
  setShowAttachmentMenu,
  messageText,
  setMessageText,
  focusAddFriendInput
}) {
  const [showMoreActions, setShowMoreActions] = React.useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false)
  const [isRecordingVoice, setIsRecordingVoice] = React.useState(false)
  const [recordingSeconds, setRecordingSeconds] = React.useState(0)
  const [voiceDraft, setVoiceDraft] = React.useState(null)
  const messageInputRef = React.useRef(null)
  const emojiPickerRef = React.useRef(null)
  const mediaRecorderRef = React.useRef(null)
  const streamRef = React.useRef(null)
  const audioChunksRef = React.useRef([])

  React.useEffect(() => {
    const handlePointerDown = (event) => {
      if (!emojiPickerRef.current) return
      if (!emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  React.useEffect(() => {
    if (!isRecordingVoice) return

    const intervalId = window.setInterval(() => {
      setRecordingSeconds((value) => value + 1)
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [isRecordingVoice])

  const insertAtCursor = (emoji) => {
    const input = messageInputRef.current
    if (!input) {
      setMessageText((current) => current + emoji)
      return
    }

    const start = input.selectionStart ?? messageText.length
    const end = input.selectionEnd ?? messageText.length
    const nextValue = `${messageText.slice(0, start)}${emoji}${messageText.slice(end)}`

    setMessageText(nextValue)

    requestAnimationFrame(() => {
      const cursorPos = start + emoji.length

      if (document.activeElement === input) {
        input.setSelectionRange(cursorPos, cursorPos)
      }
    })
  }

  const deleteVoiceDraft = () => {
    if (voiceDraft?.audioUrl) {
      URL.revokeObjectURL(voiceDraft.audioUrl)
    }
    setVoiceDraft(null)
  }

  const sendVoiceDraft = async () => {
    if (!voiceDraft || !handleSendVoiceNote) return

    await handleSendVoiceNote(voiceDraft.blob, voiceDraft.durationSeconds)
    deleteVoiceDraft()
  }

  const stopVoiceRecording = async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      setIsRecordingVoice(false)
      setRecordingSeconds(0)
      return
    }

    const recorder = mediaRecorderRef.current
    const durationSeconds = recordingSeconds

    recorder.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
      audioChunksRef.current = []

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      if (audioBlob.size > 0) {
        const audioUrl = URL.createObjectURL(audioBlob)
        setVoiceDraft({ blob: audioBlob, durationSeconds, audioUrl })
      }
    }

    recorder.stop()
    setIsRecordingVoice(false)
    setRecordingSeconds(0)
    mediaRecorderRef.current = null
  }

  const startVoiceRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecordingVoice(true)
      setRecordingSeconds(0)
    } catch (error) {
      console.error('Unable to access microphone for voice note:', error)
    }
  }

  const toggleVoiceRecording = async () => {
    if (isRecordingVoice) {
      await stopVoiceRecording()
      return
    }

    if (voiceDraft) {
      deleteVoiceDraft()
    }

    await startVoiceRecording()
  }

  const bubbleClass = (isMe) => (isMe ? 'msg-bubble-out' : 'msg-bubble-in')

  return (
    <div
      className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${mobileView === 'chat' ? 'flex' : 'hidden md:flex'}`}
    >
      <AnimatePresence mode="wait">
        {selectedGroup ? (
          <Motion.div
            key={`group-${selectedGroup.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <header className="flex h-[59px] shrink-0 items-center justify-between border-b border-chat-border bg-chat-header px-2 dark:border-chat-borderDark dark:bg-chat-headerDark sm:px-4">
              <div className="flex min-w-0 items-center gap-2">
                <button type="button" onClick={() => setMobileView('sidebar')} className="icon-btn md:hidden" aria-label="Back to chats">
                  <IconBack />
                </button>
                <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-chat-accent/20 text-chat-accent dark:text-chat-accentLight">
                  <IconUsers className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-base font-medium text-[#111b21] dark:text-[#e9edef]">{selectedGroup.name}</h3>
                  <p className="truncate text-xs text-chat-muted dark:text-chat-mutedDark">
                    {selectedGroup.members?.length || 0} members
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => startGroupCall?.(selectedGroup, 'video')}
                  className="icon-btn"
                  aria-label="Group video call"
                >
                  <IconVideo />
                </button>
                <button
                  type="button"
                  onClick={() => startGroupCall?.(selectedGroup, 'audio')}
                  className="icon-btn"
                  aria-label="Group voice call"
                >
                  <IconPhone />
                </button>
              </div>
            </header>

            <div className="chat-wallpaper min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 xl:px-8">
              <div className="rounded-lg bg-black/[0.03] p-4 dark:bg-white/[0.04]">
                <p className="text-sm font-medium text-[#111b21] dark:text-[#e9edef]">Group members</p>
                <ul className="mt-3 space-y-2">
                  {(selectedGroup.members || []).map((member) => (
                    <li key={member.id || member.userId} className="flex items-center gap-2 text-sm text-chat-muted dark:text-chat-mutedDark">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-chat-accent/15 text-xs font-semibold text-chat-accent dark:text-chat-accentLight">
                        {(member.userId || '?').slice(0, 2).toUpperCase()}
                      </span>
                      @{member.userId}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-chat-muted dark:text-chat-mutedDark">
                  Start a group voice or video call from the buttons above. Everyone in the group receives an invite.
                </p>
              </div>
            </div>
          </Motion.div>
        ) : selectedFriend ? (
          <Motion.div
            key={selectedFriend.friendId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <header className="flex h-[59px] shrink-0 items-center justify-between border-b border-chat-border bg-chat-header px-2 dark:border-chat-borderDark dark:bg-chat-headerDark sm:px-4">
              <div className="flex min-w-0 items-center gap-2">
                <button type="button" onClick={() => setMobileView('sidebar')} className="icon-btn md:hidden" aria-label="Back to chats">
                  <IconBack />
                </button>
                <UserAvatar
                  userId={selectedFriend.friendUserId}
                  avatarUrl={selectedFriend.friendAvatarUrl}
                  size="header"
                />
                <div className="min-w-0">
                  <h3 className="truncate text-base font-medium text-[#111b21] dark:text-[#e9edef]">{selectedFriend.friendUserId}</h3>
                  <p className="truncate text-xs text-chat-muted dark:text-chat-mutedDark">
                    {selectedFriend.isOnline ? 'online' : 'offline'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => sendCallInvite('Incoming video call', 'video')} className="icon-btn" aria-label="Video call">
                  <IconVideo />
                </button>
                <button
                  type="button"
                  onClick={() => sendCallInvite('Incoming voice call', 'audio')}
                  className="icon-btn"
                  aria-label="Voice call"
                >
                  <IconPhone />
                </button>
                <div className="relative">
                  <button type="button" onClick={() => setShowMoreActions((prev) => !prev)} className="icon-btn" aria-label="More">
                    <IconMore />
                  </button>
                  {showMoreActions && (
                    <div className="absolute right-0 top-11 z-20 w-48 overflow-hidden rounded-lg border border-chat-border bg-chat-sidebar shadow-lg dark:border-chat-borderDark dark:bg-chat-headerDark">
                      <button type="button" onClick={() => { setShowMoreActions(false); focusAddFriendInput(); }} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">Add contact</button>
                      <button type="button" onClick={() => { setShowMoreActions(false); setShowAttachmentMenu(true); }} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">Attach file</button>
                      <button type="button" onClick={() => { setShowMoreActions(false); setMessages([]); }} className="block w-full px-4 py-2.5 text-left text-sm text-chat-danger hover:bg-chat-danger/5">Clear chat</button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            <div ref={messageFeedRef} className="chat-wallpaper min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3 sm:px-5 xl:px-8">
              {messages.length === 0 ? (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-lg bg-black/[0.03] px-6 py-10 text-center dark:bg-white/[0.04]">
                  <IconLock className="mb-3 h-8 w-8 text-chat-muted dark:text-chat-mutedDark" />
                  <p className="text-sm text-chat-muted dark:text-chat-mutedDark">Messages are delivered over an encrypted peer channel.</p>
                  <p className="mt-1 text-xs text-chat-muted/80 dark:text-chat-mutedDark/80">Say hello to @{selectedFriend.friendUserId}</p>
                </div>
              ) : (
                messages.map((m, index) => {
                  const isMe = m.senderId === currentUser.id
                  const prevMsg = index > 0 ? messages[index - 1] : null
                  const isGrouped = prevMsg && prevMsg.senderId === m.senderId && (new Date(m.createdAt) - new Date(prevMsg.createdAt) < 180000)

                  return (
                    <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isGrouped ? 'mt-0.5' : 'mt-2'}`}>
                      {(m.type === 'file-invite' || m.type === 'file') && m.metadata ? (
                        <Motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`max-w-[min(85%,320px)] px-3 py-2 text-sm ${bubbleClass(isMe)}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="grid h-10 w-10 place-items-center rounded-lg bg-chat-accent/15 text-chat-accent dark:text-chat-accentLight">
                              <IconFile />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{m.metadata.name}</p>
                              <p className="text-xs text-chat-muted dark:text-chat-mutedDark">{formatSize(m.metadata.size)}</p>
                            </div>
                          </div>

                          {m.metadata.note && <p className="mt-2 text-sm opacity-90">“{m.metadata.note}”</p>}

                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-medium text-chat-accent dark:text-chat-accentLight">
                              {m.metadata.status === 'pending' ? (isMe ? 'Sent' : 'Incoming file') : m.metadata.status}
                            </span>
                            {!isMe && m.metadata.status === 'pending' && (
                              <div className="flex gap-2">
                                <button type="button" onClick={() => handleDeclineInlineFileInvite(m.id, selectedFriend.friendUserId)} className="rounded-md px-2 py-1 text-xs font-semibold text-chat-muted hover:bg-black/5 dark:hover:bg-white/10">Decline</button>
                                <button type="button" onClick={() => handleAcceptInlineFileInvite(m.id, selectedFriend.friendUserId, m.metadata.name, m.metadata.size, m.metadata.note)} className="rounded-md bg-chat-accent px-2 py-1 text-xs font-semibold text-white">Accept</button>
                              </div>
                            )}
                            {!isMe && m.metadata.status === 'completed' && m.metadata.downloadUrl && (
                              <a href={m.metadata.downloadUrl} download={m.metadata.name || 'download'} className="rounded-md bg-chat-accent px-2 py-1 text-xs font-semibold text-white">
                                Download
                              </a>
                            )}
                          </div>
                          <MessageMetaRow
                            time={new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            message={m}
                            isMe={isMe}
                          />
                        </Motion.div>
                      ) : m.type === 'call-invite' ? (
                        <Motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`max-w-[min(85%,320px)] px-3 py-2 text-sm ${bubbleClass(isMe)}`}>
                          <div className="flex items-center gap-2 font-medium">
                            {m.metadata?.callMode === 'audio' ? (
                              <>
                                <IconPhone className="h-4 w-4" /> Voice call
                              </>
                            ) : (
                              <>
                                <IconVideo className="h-4 w-4" /> Video call
                              </>
                            )}
                          </div>
                          <p className="mt-1 text-sm opacity-90">{m.content}</p>
                          {!isMe && m.metadata?.status === 'pending' && (
                            <div className="mt-2 flex gap-2">
                              <button type="button" onClick={() => { setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, metadata: { ...msg.metadata, status: 'accepted' } } : msg)); answerCall(selectedFriend.friendUserId, m.metadata?.callMode || 'video'); }} className="rounded-md bg-chat-accent px-3 py-1.5 text-xs font-semibold text-white">Answer</button>
                              <button type="button" onClick={() => { setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, metadata: { status: 'declined' } } : msg)); wsRef.current.send(JSON.stringify({ type: 'invite-response', targetUserId: selectedFriend.friendUserId.toLowerCase(), accepted: false, messageId: m.id })); }} className="rounded-md px-3 py-1.5 text-xs font-semibold text-chat-muted">Decline</button>
                            </div>
                          )}
                        </Motion.div>
                      ) : m.type === 'voice' ? (
                        <Motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`max-w-[min(85%,320px)] px-3 py-2 text-sm ${bubbleClass(isMe)}`}
                        >
                          <div className="flex items-center gap-2">
                            <IconMic className="h-4 w-4 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium">Voice message</p>
                              <p className="text-xs text-chat-muted dark:text-chat-mutedDark">
                                {m.metadata?.duration ? `${m.metadata.duration.toFixed(1)}s` : 'Audio'}
                                {m.metadata?.size ? ` · ${formatSize(m.metadata.size)}` : ''}
                              </p>
                            </div>
                          </div>
                          {m.audioUrl ? (
                            <audio controls src={m.audioUrl} className="mt-2 h-9 w-full max-w-[240px]" />
                          ) : (
                            <p className="mt-2 text-xs text-chat-muted dark:text-chat-mutedDark">Audio ready</p>
                          )}
                          <MessageMetaRow
                            time={new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            message={m}
                            isMe={isMe}
                          />
                        </Motion.div>
                      ) : (
                        <Motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`max-w-[min(85%,480px)] px-3 py-1.5 text-[15px] leading-[1.35] ${bubbleClass(isMe)}`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.content}</p>
                          <MessageMetaRow
                            time={new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            message={m}
                            isMe={isMe}
                          />
                        </Motion.div>
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
              <div className="mx-3 mb-1 flex items-center justify-between rounded-lg border border-chat-border bg-white px-3 py-2 text-xs dark:border-chat-borderDark dark:bg-chat-headerDark">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{selectedFile.name}</p>
                  <p className="text-chat-muted dark:text-chat-mutedDark">{formatSize(selectedFile.size)}</p>
                </div>
                <button type="button" onClick={() => { setSelectedFile(null); if (currentFileRef) currentFileRef.current = null; if (fileInputRef?.current) fileInputRef.current.value = ''; }} className="ml-2 text-xs font-semibold text-chat-danger">Remove</button>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="composer-shell safe-bottom relative">
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

              {showAttachmentMenu && (
                <div className="absolute bottom-full left-3 z-20 mb-2 w-44 overflow-hidden rounded-lg border border-chat-border bg-chat-sidebar shadow-lg dark:border-chat-borderDark dark:bg-chat-headerDark">
                  <button type="button" onClick={() => { setShowAttachmentMenu(false); fileInputRef.current?.click(); }} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">Document</button>
                  <button type="button" onClick={() => { setShowAttachmentMenu(false); sendCallInvite('Incoming video call', 'video'); }} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">Video call</button>
                  <button type="button" onClick={() => { setShowAttachmentMenu(false); sendCallInvite('Incoming voice call', 'audio'); }} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">Voice call</button>
                </div>
              )}

              {showEmojiPicker && (
                <div ref={emojiPickerRef} className="absolute bottom-full left-12 z-30 mb-2 w-[min(88vw,320px)] overflow-hidden rounded-lg border border-chat-border bg-chat-sidebar shadow-lg dark:border-chat-borderDark dark:bg-chat-headerDark">
                  <EmojiPicker
                    onEmojiClick={(emojiData) => {
                      insertAtCursor(emojiData.emoji)
                    }}
                    width="100%"
                    height={320}
                    previewConfig={{ showPreview: false }}
                    searchDisabled={false}
                    skinTonesDisabled={true}
                    theme={darkMode ? 'dark' : 'light'}
                  />
                </div>
              )}

              {voiceDraft && (
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-chat-border bg-white p-2 dark:border-chat-borderDark dark:bg-[#2a3942]">
                  <div className="flex min-w-0 items-center gap-2">
                    <IconMic className="h-5 w-5 shrink-0 text-chat-accent" />
                    <span className="text-xs">{voiceDraft.durationSeconds ? `${voiceDraft.durationSeconds.toFixed(1)}s` : 'Voice'} · ready</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <audio controls src={voiceDraft.audioUrl} className="h-8 max-w-[140px]" />
                    <button type="button" onClick={deleteVoiceDraft} className="text-xs font-semibold text-chat-muted">Delete</button>
                    <button type="button" onClick={sendVoiceDraft} className="primary-action !px-3 !py-1.5 !text-xs">Send</button>
                  </div>
                </div>
              )}

              <div className="flex w-full items-end gap-2">
                <button type="button" onClick={() => setShowEmojiPicker((prev) => !prev)} className="icon-btn shrink-0" aria-label="Emoji">
                  <IconSmile />
                </button>
                <button type="button" onClick={() => setShowAttachmentMenu(!showAttachmentMenu)} className="icon-btn shrink-0" aria-label="Attach">
                  <IconAttach />
                </button>
                <input
                  ref={messageInputRef}
                  type="text"
                  required={!selectedFile}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      if (messageText.trim() || selectedFile) {
                        handleSendMessage(event)
                      }
                    }
                  }}
                  placeholder={selectedFile ? 'Caption (optional)' : 'Type a message'}
                  className="composer-input"
                />
                {messageText.trim() || selectedFile ? (
                  <button type="submit" className="icon-btn-accent shrink-0" aria-label="Send">
                    <IconSend className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={toggleVoiceRecording}
                    className={`icon-btn shrink-0 ${isRecordingVoice ? '!bg-chat-danger !text-white' : ''}`}
                    aria-label={isRecordingVoice ? 'Stop recording' : 'Record voice'}
                    title={isRecordingVoice ? `Recording ${recordingSeconds}s` : 'Record voice'}
                  >
                    {isRecordingVoice ? <span className="text-xs font-bold">■</span> : <IconMic />}
                  </button>
                )}
              </div>
            </form>
          </Motion.div>
        ) : (
          <Motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <EmptyChatPane />
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
