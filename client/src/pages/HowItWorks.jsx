const steps = [
  ['Connect', 'A small signaling service helps two browsers discover each other and swap connection details.'],
  ['Find a route', 'WebRTC uses STUN to pick the most direct path, even across different networks.'],
  ['Secure channel', 'Messages, calls, and file chunks flow over encrypted peer channels.'],
  ['Share smoothly', 'Large files stream in chunks so the tab stays responsive end to end.'],
]

export default function HowItWorks() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <header className="lg:sticky lg:top-20 lg:self-start">
          <p className="text-sm font-semibold text-chat-accent dark:text-chat-accentLight">How it works</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-[#111b21] sm:text-4xl dark:text-[#e9edef]">
            Direct connection, familiar chat.
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 text-chat-muted dark:text-chat-mutedDark">
            Your content does not need a central file server. The app only coordinates the handshake—then peers talk directly.
          </p>
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-chat-border bg-chat-header px-4 py-3 text-sm dark:border-chat-borderDark dark:bg-chat-headerDark">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-chat-accent/15 text-chat-accent dark:text-chat-accentLight">↔</span>
            <span className="text-[#111b21] dark:text-[#e9edef]">Browser-to-browser, encrypted</span>
          </div>
        </header>

        <ol className="space-y-3">
          {steps.map(([title, text], index) => (
            <li key={title} className="surface-card flex gap-4 p-5 sm:p-6">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-chat-accent text-sm font-bold text-white">
                {index + 1}
              </span>
              <div>
                <h2 className="text-base font-semibold text-[#111b21] dark:text-[#e9edef]">{title}</h2>
                <p className="mt-1.5 text-sm leading-6 text-chat-muted dark:text-chat-mutedDark">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
