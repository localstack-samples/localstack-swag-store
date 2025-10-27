type CoinDisplayProps = {
  count: number
  showText?: boolean
  textClassName?: string
  coinSize?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5'
}

function formatCoins(requiredCoins: number): string {
  const unit = requiredCoins === 1 ? 'Coin' : 'Coins'
  return `Requires ${requiredCoins} ${unit}`
}

function renderCoins(count: number, size: 'sm' | 'md' | 'lg') {
  return (
    <div className="flex items-center">
      {Array.from({ length: count }, (_, index) => (
        <img
          key={index}
          src="/images/coin.svg"
          alt="Coin"
          className={`${sizeClasses[size]} -ml-2 first:ml-0`}
          style={{ zIndex: index + 1 }}
        />
      ))}
    </div>
  )
}

export default function CoinDisplay({ 
  count, 
  showText = true, 
  textClassName = "text-md text-violet-500",
  coinSize = 'md'
}: CoinDisplayProps) {
  return (
    <div className="flex items-center gap-2">
      {renderCoins(count, coinSize)}
      {showText && (
        <span className={textClassName}>
          {formatCoins(count)}
        </span>
      )}
    </div>
  )
}
