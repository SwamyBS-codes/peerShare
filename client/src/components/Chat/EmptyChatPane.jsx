import BrandMark from '../BrandMark'
import { IconFile, IconLock, IconMic, IconVideo } from '../icons/MessageIcons'

const features = [
  {
    icon: IconLock,
    title: 'Direct peer links',
    text: 'Messages and files go browser-to-browser after a quick handshake.',
  },
  {
    icon: IconFile,
    title: 'Large file sends',
    text: 'Share documents without uploading them to a central storage bucket.',
  },
  {
    icon: IconVideo,
    title: 'Calls & groups',
    text: 'One-to-one or group voice and video when your peers are online.',
  },
  {
    icon: IconMic,
    title: 'Voice notes',
    text: 'Record and send short audio clips inside any conversation.',
  },
]

export function EmptyChatPane() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-ps-pane-light dark:bg-ps-pane">
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center lg:items-start lg:px-10 lg:py-12 lg:text-left xl:px-14">
          <BrandMark className="mb-6 h-20 w-20 shadow-xl shadow-indigo-500/25 sm:h-24 sm:w-24" />
          <h2 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-white sm:text-3xl">
            PeerShare
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-chat-muted dark:text-chat-mutedDark sm:text-base">
            Pick a chat on the left, or add a contact to start. Everything here is built for private, real-time P2P
            communication.
          </p>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-xs font-medium text-indigo-700 dark:border-indigo-400/25 dark:bg-indigo-500/15 dark:text-indigo-200">
            <IconLock className="h-4 w-4" />
            Encrypted peer sessions
          </p>
        </div>

        <div className="grid flex-[1.2] grid-cols-1 gap-3 border-t border-chat-border/80 p-6 dark:border-chat-borderDark/80 sm:grid-cols-2 sm:p-8 lg:border-l lg:border-t-0 lg:content-center lg:p-10">
          {features.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="rounded-2xl border border-chat-border/60 bg-white/70 p-5 backdrop-blur-sm dark:border-chat-borderDark/80 dark:bg-white/[0.04]"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ps-brand text-white shadow-md shadow-indigo-500/20">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-slate-800 dark:text-[#e8eaef]">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-chat-muted dark:text-chat-mutedDark">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
