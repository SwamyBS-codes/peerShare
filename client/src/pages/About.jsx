export default function About() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6">
      <h1 className="text-3xl font-black text-slate-900 dark:text-white">About PeerShare</h1>
      <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
        PeerShare uses WebRTC DataChannels for direct device-to-device transfer. A lightweight Node.js
        WebSocket signaling server only exchanges SDP and ICE metadata. File content never gets stored
        permanently on the server.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Architecture</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li>WebRTC peer connection + data channels</li>
            <li>WebSocket signaling for SDP/ICE exchange</li>
            <li>Chunked binary transfer for reliability</li>
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Security Model</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li>Temporary transfer session links</li>
            <li>No persistent server-side file storage</li>
            <li>Sender keeps session page open during transfer</li>
          </ul>
        </article>
      </div>
    </section>
  )
}
