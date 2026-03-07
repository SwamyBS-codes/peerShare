import { Link } from 'react-router-dom'

export default function NearbyShare() {
  return (
    <section className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 md:px-6">
      <header className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/85">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">Nearby Share</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">Quick local transfer mode</h1>
        <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">
          Use a 4-digit local code or QR code to connect nearby devices quickly. No permanent server
          storage, direct device-to-device transfer only.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-xl transition hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900/85">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">I want to send</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Generate a local 4-digit code, share it, and start transfer when receiver connects.
          </p>
          <Link
            to="/send?mode=nearby"
            className="mt-5 inline-flex rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-orange-500/30"
          >
            Open Nearby Sender
          </Link>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-xl transition hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900/85">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">I want to receive</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Enter the 4-digit local code from sender or scan the QR code to connect instantly.
          </p>
          <Link
            to="/receive?mode=nearby"
            className="mt-5 inline-flex rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-sky-500/30"
          >
            Open Nearby Receiver
          </Link>
        </article>
      </div>
    </section>
  )
}
