import React, { useRef } from 'react'
import { FileTransferOverlay } from './FileTransferOverlay'
import { IconClose, IconFile, IconLinkShare } from '../icons/MessageIcons'

export function LinkSharePanel({
  session,
  onClose,
  sendFile,
  transferState,
  transferFileName,
  transferProgress,
  transferSpeed,
  cancelTransfer,
  formatSize,
  formatSpeed,
  receivedFiles,
}) {
  const fileInputRef = useRef(null)

  if (!session) return null

  const pickFile = () => fileInputRef.current?.click()

  const onFilePicked = (e) => {
    const file = e.target.files?.[0]
    if (file) sendFile(file)
    e.target.value = ''
  }

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div className="flex max-h-[min(92dvh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-chat-border bg-chat-sidebar shadow-2xl dark:border-chat-borderDark dark:bg-chat-headerDark">
        <header className="flex items-center justify-between border-b border-chat-border px-4 py-3 dark:border-chat-borderDark">
          <div className="flex min-w-0 items-center gap-2">
            <IconLinkShare className="h-5 w-5 shrink-0 text-chat-accent" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[#111b21] dark:text-[#e9edef]">Link session</p>
              <p className="truncate text-xs text-chat-muted dark:text-chat-mutedDark">Peer @{session.peerUserId}</p>
            </div>
          </div>
          <button type="button" className="icon-btn !h-8 !w-8" aria-label="Close session" onClick={onClose}>
            <IconClose className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          <p className="text-sm text-chat-muted dark:text-chat-mutedDark">
            Files go directly between your devices. Pick a file to send; incoming files appear below.
          </p>

          <input ref={fileInputRef} type="file" className="hidden" onChange={onFilePicked} />

          <button
            type="button"
            onClick={pickFile}
            disabled={transferState && ['connecting', 'sending', 'receiving'].includes(transferState)}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-chat-accent/40 bg-chat-accent/5 px-4 py-8 text-sm font-semibold text-chat-accent hover:bg-chat-accent/10 disabled:opacity-50 dark:text-chat-accentLight"
          >
            <IconFile className="h-5 w-5" />
            Choose file to send
          </button>

          <FileTransferOverlay
            transferState={transferState}
            transferFileName={transferFileName}
            transferProgress={transferProgress}
            transferSpeed={transferSpeed}
            cancelFileTransfer={cancelTransfer}
            formatSpeed={formatSpeed}
          />

          {receivedFiles?.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-chat-muted dark:text-chat-mutedDark">Received</p>
              <ul className="space-y-2">
                {receivedFiles.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-chat-border px-3 py-2 dark:border-chat-borderDark"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#111b21] dark:text-[#e9edef]">{item.name}</p>
                      <p className="text-xs text-chat-muted dark:text-chat-mutedDark">{formatSize(item.size)}</p>
                    </div>
                    <a
                      href={item.url}
                      download={item.name}
                      className="shrink-0 rounded-lg bg-chat-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-chat-accentHover"
                    >
                      Save
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
