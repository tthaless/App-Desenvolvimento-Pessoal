interface Props {
  name: string
  url?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export default function Avatar({ name, url, size = 'md', className = '' }: Props) {
  return (
    <span className={`avatar ${size} ${className}`}>
      {url ? <img src={url} alt="" /> : name.slice(0, 1).toUpperCase() || '?'}
    </span>
  )
}
