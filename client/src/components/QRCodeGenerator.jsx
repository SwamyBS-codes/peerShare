import { QRCodeCanvas } from 'qrcode.react'

export default function QRCodeGenerator({ value }) {
  if (!value) return null

  return (
    <div className="relative group">
      {/* Decorative Outer Ring */}
      <div className="absolute -inset-1 rounded-[24px] bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 blur-md opacity-75 group-hover:opacity-100 transition duration-300" />
      
      {/* QR Code Container */}
      <div className="relative inline-flex rounded-3xl bg-white p-4.5 shadow-xl border border-slate-200/50 dark:border-slate-800/10">
        <QRCodeCanvas 
          value={value} 
          size={160} 
          bgColor="#ffffff"
          fgColor="#0f172a"
          level="H"
          includeMargin={true}
        />
        
        {/* Frame Brackets */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-indigo-500 rounded-tl-md" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-indigo-500 rounded-tr-md" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-indigo-500 rounded-bl-md" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-indigo-500 rounded-br-md" />
      </div>
    </div>
  )
}
