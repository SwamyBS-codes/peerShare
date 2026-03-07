import { QRCodeCanvas } from 'qrcode.react'

export default function QRCodeGenerator({ value }) {
  if (!value) return null

  return (
    <div className="inline-flex rounded-2xl bg-white p-4 shadow-lg ring-1 ring-slate-200 dark:bg-slate-100">
      <QRCodeCanvas value={value} size={180} includeMargin />
    </div>
  )
}
