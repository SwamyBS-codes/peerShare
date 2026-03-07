import { Link } from 'react-router-dom'
import BrandMark from '../components/BrandMark'

export default function Home() {
  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-8 px-4 py-12 md:grid-cols-2 md:px-6">
      <div className="relative space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-sky-600 ring-1 ring-sky-100 dark:bg-slate-900/80 dark:text-sky-300 dark:ring-slate-700">
          <BrandMark className="h-6 w-6" />
          PeerShare
        </div>
        <h1 className="text-4xl font-black leading-tight text-slate-900 dark:text-white md:text-5xl lg:text-6xl">
          Instant Peer-to-Peer File Sharing
        </h1>
        <p className="max-w-xl text-base text-slate-600 dark:text-slate-300">
          Send files directly between devices with WebRTC. No permanent cloud storage, just fast and
          secure browser-to-browser transfer.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/send"
            className="hover-lift rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-3 font-semibold text-white shadow-lg shadow-sky-500/30 transition"
          >
            Send File
          </Link>
          <Link
            to="/receive"
            className="hover-lift rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Receive File
          </Link>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/80 p-6 shadow-2xl shadow-slate-200/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/75 dark:shadow-black/30">
        <div className="float-slow absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-cyan-300 to-sky-400 opacity-60 blur-md dark:opacity-40" />
        <div className="float-slower absolute -bottom-10 left-8 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-300 to-violet-400 opacity-55 blur-lg dark:opacity-35" />

        <h2 className="relative text-lg font-bold text-slate-900 dark:text-white">Why PeerShare</h2>
        <ul className="relative mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <li className="hover-lift rounded-xl bg-slate-50 p-3 transition dark:bg-slate-800/70">Direct device-to-device transfer</li>
          <li className="hover-lift rounded-xl bg-slate-50 p-3 transition dark:bg-slate-800/70">Share link and QR code onboarding</li>
          <li className="hover-lift rounded-xl bg-slate-50 p-3 transition dark:bg-slate-800/70">Realtime progress, speed, and status updates</li>
          <li className="hover-lift rounded-xl bg-slate-50 p-3 transition dark:bg-slate-800/70">No permanent server-side file storage</li>
        </ul>
      </div>
    </section>
  )
}
