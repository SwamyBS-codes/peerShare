import React, { useEffect, useMemo, useState } from 'react'
import QRCodeGenerator from '../QRCodeGenerator'
import { IconClose, IconLinkShare } from '../icons/MessageIcons'

export function ShareLinkModal({ open, onClose, wsRef, linkCode, waiting, connectedPeer, onEndLink }) {
  const [copied, setCopied] = useState(false)

  const shareUrl = useMemo(() => {
    if (!linkCode) return ''
    const base = window.location.origin
    return `${base}/link/${linkCode}`
  }, [linkCode])

  useEffect(() => {
    if (!open) setCopied(false)
  }, [open])

  useEffect(() => {
    if (!open || linkCode || !wsRef?.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ type: 'link-create' }))
  }, [open, linkCode, wsRef])

  const copyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const handleClose = () => {
    if (!connectedPeer && linkCode && wsRef?.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'link-close', code: linkCode }))
      onEndLink?.()
    }
    onClose()
  }

  if (!open) return null

  return (
    <>
      <button type="button" className="fixed inset-0 z-50 bg-black/50" aria-label="Close" onClick={handleClose} />
      <div className="fixed left-1/2 top-1/2 z-[51] flex max-h-[min(90vh,560px)] w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-chat-border bg-chat-sidebar shadow-2xl dark:border-chat-borderDark dark:bg-chat-headerDark">
        <header className="flex items-center justify-between border-b border-chat-border px-4 py-3 dark:border-chat-borderDark">
          <div className="flex items-center gap-2">
            <IconLinkShare className="h-5 w-5 text-chat-accent" />
            <h2 className="text-base font-medium text-[#111b21] dark:text-[#e9edef]">Share via link</h2>
          </div>
          <button type="button" onClick={handleClose} className="icon-btn !h-8 !w-8" aria-label="Close">
            <IconClose className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
          <p className="text-sm text-chat-muted dark:text-chat-mutedDark">
            Send this link to anyone on PeerShare. When they open it and tap Connect, you can exchange files directly over WebRTC.
          </p>

          {shareUrl ? (
            <>
              <div className="flex flex-col items-center gap-3">
                <QRCodeGenerator value={shareUrl} />
                <p className="text-center text-xs text-chat-muted dark:text-chat-mutedDark">Scan or copy the link below</p>
              </div>

              <div className="flex gap-2">
                <input readOnly value={shareUrl} className="field-control min-w-0 flex-1 !rounded-lg text-xs" />
                <button type="button" onClick={copyLink} className="shrink-0 rounded-lg bg-chat-accent px-3 py-2 text-xs font-semibold text-white hover:bg-chat-accentHover">
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              {connectedPeer ? (
                <p className="rounded-lg bg-chat-accent/10 px-3 py-2 text-sm font-medium text-chat-accent dark:text-chat-accentLight">
                  Connected with @{connectedPeer}
                </p>
              ) : waiting ? (
                <p className="animate-pulse text-center text-sm text-chat-muted dark:text-chat-mutedDark">Waiting for peer to join…</p>
              ) : null}
            </>
          ) : (
            <p className="text-center text-sm text-chat-muted dark:text-chat-mutedDark">Generating link…</p>
          )}
        </div>
      </div>
    </>
  )
}
