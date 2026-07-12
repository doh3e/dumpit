import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { STICKER_SPRITES, spriteFor } from '../shop/registry'

// 모듈 레벨 캐시 — 여러 StickerPicker 인스턴스가 /shop/catalog 결과를 공유.
// 최초 팝오버 오픈 시 fetch, 'dumpit:catalog-updated' 수신 시 무효화.
let ownedCache = null
let ownedPromise = null

function invalidateOwnedCache() {
  ownedCache = null
  ownedPromise = null
}

if (typeof window !== 'undefined') {
  window.addEventListener('dumpit:catalog-updated', invalidateOwnedCache)
}

function fetchOwnedStickers() {
  if (ownedCache) return Promise.resolve(ownedCache)
  if (ownedPromise) return ownedPromise

  ownedPromise = api.get('/shop/catalog')
    .then((res) => {
      const items = Array.isArray(res.data?.items) ? res.data.items : []
      const owned = items
        .filter((item) => item.type === 'STICKER' && item.owned)
        .map((item) => ({ code: item.code, ...spriteFor(STICKER_SPRITES, item.code) }))
        .filter((sticker) => sticker.img)
      ownedCache = owned
      return owned
    })
    .catch(() => {
      ownedPromise = null
      return []
    })

  return ownedPromise
}

export default function StickerPicker({ current, onSelect }) {
  const [open, setOpen] = useState(false)
  const [owned, setOwned] = useState(ownedCache || [])
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    if (!open) return

    const handleClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const loadOwned = useCallback(() => {
    setLoading(true)
    fetchOwnedStickers()
      .then(setOwned)
      .finally(() => setLoading(false))
  }, [])

  const handleTriggerClick = (event) => {
    event.stopPropagation()
    setOpen((value) => {
      const next = !value
      if (next) loadOwned()
      return next
    })
  }

  const handleChoose = (event, code) => {
    event.stopPropagation()
    setOpen(false)
    onSelect(code)
  }

  const currentSprite = current ? spriteFor(STICKER_SPRITES, current) : null

  return (
    <div className="relative inline-block" ref={wrapperRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={handleTriggerClick}
        aria-label={currentSprite ? `부착된 스티커: ${currentSprite.name}` : '스티커 붙이기'}
        title={currentSprite ? currentSprite.name : '스티커 붙이기'}
        className={
          currentSprite
            ? 'flex h-5 w-5 items-center justify-center rounded-full flex-shrink-0'
            : 'flex h-5 w-5 items-center justify-center rounded-full border-2 border-dashed border-line text-sub hover:bg-chip hover:text-dark transition-colors flex-shrink-0'
        }
      >
        {currentSprite ? (
          <img
            src={currentSprite.img}
            alt={currentSprite.name}
            className="h-4 w-4 object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <span className="text-[11px] leading-none font-black">+</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-6 z-50 w-56">
          <div className="card-retro !p-3 bg-card">
            {loading ? (
              <p className="py-3 text-center text-xs font-bold text-sub">불러오는 중...</p>
            ) : owned.length === 0 ? (
              <div className="py-2 text-center">
                <p className="text-xs font-bold text-dark">보유한 스티커가 없어요</p>
                <Link
                  to="/shop"
                  onClick={(event) => { event.stopPropagation(); setOpen(false) }}
                  className="mt-2 inline-block text-xs font-black text-primary hover:underline"
                >
                  상점에서 스티커를 구매해보세요
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-2">
                  {owned.map((sticker) => (
                    <button
                      key={sticker.code}
                      type="button"
                      title={sticker.name}
                      onClick={(event) => handleChoose(event, sticker.code)}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border-2 transition-colors ${
                        current === sticker.code ? 'border-primary' : 'border-line hover:border-edge'
                      }`}
                    >
                      <img
                        src={sticker.img}
                        alt={sticker.name}
                        className="h-6 w-6 object-contain"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </button>
                  ))}
                </div>
                {current && (
                  <button
                    type="button"
                    onClick={(event) => handleChoose(event, null)}
                    className="mt-3 w-full rounded-lg border-2 border-line py-1.5 text-xs font-bold text-sub hover:border-edge hover:text-dark transition-colors"
                  >
                    떼기
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
