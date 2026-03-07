const steps = [
  {
    title: 'Select file',
    description: 'Sender chooses one or multiple files using drag-and-drop or file picker.',
  },
  {
    title: 'Share link or QR',
    description: 'PeerShare creates a unique session link and QR code for fast receiver access.',
  },
  {
    title: 'Receiver downloads directly',
    description: 'WebRTC data channels move file chunks peer-to-peer in realtime.',
  },
]

export default function HowItWorks() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6">
      <h1 className="text-3xl font-black text-slate-900 dark:text-white">How It Works</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">Three simple steps to share files directly.</p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <article
            key={step.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-500">Step {index + 1}</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{step.title}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
