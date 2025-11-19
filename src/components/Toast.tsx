interface ToastProps {
  message: string | null
}

export function Toast({ message }: ToastProps) {
  if (!message) return null
  return (
    <div className="fixed top-4 right-4 z-50 rounded-lg bg-gray-900/90 px-5 py-3 text-sm font-medium text-white shadow-lg">
      {message}
    </div>
  )
}
