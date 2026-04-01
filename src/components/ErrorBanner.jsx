import { AlertTriangle, X } from 'lucide-react'

export function ErrorBanner({ error, onDismiss }) {
  if (!error) return null
  return (
    <div className="flex items-center gap-3 bg-red-900/20 border border-red-500/50 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
      <AlertTriangle className="text-red-500 flex-shrink-0" size={20} />
      <div className="flex-1">
        <p className="text-xs font-bold text-red-400">System Notification</p>
        <p className="text-xs text-red-200/80">{error}</p>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-red-400 hover:text-white">
          <X size={16} />
        </button>
      )}
    </div>
  )
}
