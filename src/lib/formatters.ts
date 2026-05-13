export function formatDate(timestamp: number): string {
  const d = new Date(timestamp * 1000)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export function maskValue(value: string): string {
  if (value.length <= 4) return '****'
  return value.slice(0, 2) + '****' + value.slice(-2)
}

export function strengthLabel(score: number): string {
  if (score < 2) return '弱'
  if (score < 4) return '中'
  return '强'
}

export function strengthColor(score: number): string {
  if (score < 2) return 'bg-red-500'
  if (score < 4) return 'bg-yellow-500'
  return 'bg-green-500'
}
