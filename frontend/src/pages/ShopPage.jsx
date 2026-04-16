import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const CATEGORY_LABEL = { ALL: '전체', STICKER: '스티커', THEME: '테마' }

export default function ShopPage() {
  const { user, refreshCoins } = useAuth()
  const [filter, setFilter] = useState('ALL')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(null)
  const myCoins = user?.coins ?? 0

  const fetchItems = () => {
    api.get('/shop/items')
      .then((res) => setItems(res.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchItems() }, [])

  const handlePurchase = async (item) => {
    if (purchasing) return
    setPurchasing(item.id)
    try {
      await api.post('/shop/purchase', { itemId: item.id })
      fetchItems()
      refreshCoins()
    } catch (err) {
      const msg = err.response?.data?.message || '구매에 실패했어요'
      alert(msg)
    } finally {
      setPurchasing(null)
    }
  }

  const filtered = filter === 'ALL' ? items : items.filter((i) => i.category === filter)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="heading-kitschy text-2xl">코인샵</h2>
          <p className="mt-2 text-sm font-semibold text-dark/60">
            일정 달성으로 모은 코인으로 꾸밀 수 있어요!
          </p>
        </div>
        <div className="card-kitschy flex items-center gap-2 py-3">
          <div>
            <p className="text-xs font-bold text-dark/50">내 코인</p>
            <p className="text-xl font-black text-primary">{myCoins.toLocaleString()} C</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {Object.entries(CATEGORY_LABEL).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`btn-kitschy text-sm py-2 ${
              filter === key ? 'bg-primary text-white' : 'bg-accent text-dark'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card-kitschy text-center py-12">
          <p className="font-bold text-dark/50">불러오는 중...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const canAfford = myCoins >= item.price
            const isBuying = purchasing === item.id
            return (
              <div
                key={item.id}
                className={`card-kitschy flex flex-col items-center text-center gap-3 ${
                  item.isOwned ? 'opacity-60' : ''
                }`}
              >
                <div
                  className="w-16 h-16 rounded-lg border-2 border-dark"
                  style={{ backgroundColor: item.color }}
                />
                <div>
                  <p className="font-extrabold text-dark text-sm">{item.name}</p>
                  <p className="text-xs text-dark/50 font-medium capitalize">{CATEGORY_LABEL[item.category]}</p>
                </div>
                <button
                  onClick={() => handlePurchase(item)}
                  disabled={item.isOwned || !canAfford || isBuying}
                  className={`btn-kitschy w-full text-sm py-2 ${
                    item.isOwned
                      ? 'bg-dark/10 text-dark/40 cursor-default border-dark/20'
                      : canAfford
                      ? 'bg-secondary text-white'
                      : 'bg-accent text-dark/40 border-dark/20 cursor-not-allowed'
                  }`}
                >
                  {item.isOwned ? '보유 중' : isBuying ? '구매 중...' : `${item.price} C`}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
