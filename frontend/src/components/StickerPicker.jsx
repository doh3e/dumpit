import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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

const POPOVER_WIDTH = 224 // w-56
const POPOVER_EST_HEIGHT = 170 // 플립 판단용 추정치 (한 줄 격자 + 떼기 버튼 + 패딩)
const VIEWPORT_MARGIN = 8

export default function StickerPicker({ current, onSelect }) {
  const [open, setOpen] = useState(false)
  const [owned, setOwned] = useState(ownedCache || [])
  const [loading, setLoading] = useState(false)
  const [popoverPos, setPopoverPos] = useState(null)
  const triggerRef = useRef(null)
  const popoverRef = useRef(null)

  useEffect(() => {
    if (!open) return

    const handleClick = (event) => {
      if (triggerRef.current?.contains(event.target)) return
      if (popoverRef.current?.contains(event.target)) return
      setOpen(false)
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const loadOwned = useCallback(() => {
    if (ownedCache) {
      // 캐시가 따뜻하면 로딩 플래시 없이 바로 반영
      setOwned(ownedCache)
      return
    }
    setLoading(true)
    fetchOwnedStickers()
      .then(setOwned)
      .finally(() => setLoading(false))
  }, [])

  const computePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return null

    let left = rect.right - POPOVER_WIDTH
    left = Math.min(left, window.innerWidth - POPOVER_WIDTH - VIEWPORT_MARGIN)
    left = Math.max(left, VIEWPORT_MARGIN)

    // 아래 공간이 모자라고 위 공간이 충분하면 트리거 위로 플립
    const flipUp = rect.bottom + POPOVER_EST_HEIGHT > window.innerHeight - VIEWPORT_MARGIN
      && rect.top > POPOVER_EST_HEIGHT + VIEWPORT_MARGIN
    if (flipUp) {
      return { left, bottom: window.innerHeight - rect.top + 4 }
    }
    return { left, top: rect.bottom + 4 }
  }

  const handleTriggerClick = (event) => {
    event.stopPropagation()
    if (open) {
      setOpen(false)
      return
    }
    setPopoverPos(computePosition())
    loadOwned()
    setOpen(true)
  }

  const handleChoose = (event, code) => {
    event.stopPropagation()
    setOpen(false)
    onSelect(code)
  }

  const currentSprite = current ? spriteFor(STICKER_SPRITES, current) : null

  return (
    <div className="inline-block" ref={triggerRef} onClick={(e) => e.stopPropagation()}>
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

      {open && popoverPos && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-50 w-56"
          style={popoverPos}
          onClick={(e) => e.stopPropagation()}
        >
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
                <div className="mt-2 text-center">
                  <Link
                    to="/shop"
                    onClick={(event) => { event.stopPropagation(); setOpen(false) }}
                    className="text-[11px] text-sub hover:text-dark"
                  >
                    상점에서 더 보기
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
