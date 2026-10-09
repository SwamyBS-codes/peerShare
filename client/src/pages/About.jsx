const stack = [
  ['React 19', 'Real-time UI and chat state.'],
  ['WebRTC', 'Direct calls and file data channels.'],
  ['WebSockets', 'Lightweight signaling.'],
  ['Express + Node', 'Auth and API.'],
  ['Prisma', 'Accounts and activity history.'],
  ['Tailwind CSS', 'Responsive messenger layout.'],
]

export default function About() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold text-chat-accent dark:text-chat-accentLight">About PeerShare</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#111b21] sm:text-4xl dark:text-[#e9edef]">
          Messaging and files, direct between browsers.
        </h1>
        <p className="mt-4 text-base leading-7 text-chat-muted dark:text-chat-mutedDark">
          PeerShare combines a familiar chat experience with peer-to-peer transfers—no bulky upload servers for your content.
        </p>
      </header>

      <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <article className="surface-card p-6 sm:p-8">
          <BrandMarkInline />
          <h2 className="mt-5 text-xl font-semibold text-[#111b21] dark:text-[#e9edef]">Built for real-time</h2>
          <p className="mt-3 text-sm leading-6 text-chat-muted dark:text-chat-mutedDark">
            Modern browser APIs power calls, voice notes, and large file sends while keeping the interface fast on phones and desktops.
          </p>
          <a
            href="https://github.com/swamybs2005"
            target="_blank"
            rel="noreferrer"
            className="primary-action mt-6 inline-flex"
          >
            View project
          </a>
        </article>

        <div className="grid gap-3 sm:grid-cols-2">
          {stack.map(([name, text]) => (
            <article key={name} className="surface-card p-5">
              <h2 className="text-sm font-semibold text-[#111b21] dark:text-[#e9edef]">{name}</h2>
              <p className="mt-2 text-xs leading-5 text-chat-muted dark:text-chat-mutedDark">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function BrandMarkInline() {
  return (
    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-chat-accent text-lg font-bold text-white">
      PS
    </span>
  )
}
