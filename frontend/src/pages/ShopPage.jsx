import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import api, { getApiErrorMessage } from '../services/api'
import coinImage from '../assets/coin_image.png'
import { useAuth } from '../context/AuthContext'
import RocketLaunch from '../components/RocketLaunch'
import {
  PLANET_SPRITES,
  CELEBRATION_SPRITES,
  STATION_SPRITES,
  STICKER_SPRITES,
  spriteFor,
} from '../shop/registry'

// 색상 테마 미리보기 스와치 — 라이트 기준 대표색 (bg/accent/chip 또는 chrome-bg/line, pomo focus/break)
const SKIN_PREVIEWS = {
  'bg.ocean': ['#E4EFEC', '#2E7D8A', '#D3E6E1'],
  'bg.lavender': ['#EEEAF4', '#8A63C4', '#E2DAEC'],
  'bg.rose': ['#F5E9EA', '#C25B6E', '#EDD8DB'],
  'bg.sprout': ['#EAF2E3', '#5C8A3C', '#DCEBCE'],
  'bg.galaxy': ['#E9EAF6', '#6D74C9', '#DBDDF0'],
  'chrome.ocean': ['#E4EFEC', '#B7D4CD'],
  'chrome.lavender': ['#EEEAF4', '#CBBEDC'],
  'chrome.rose': ['#F5E9EA', '#DDBCC2'],
  'chrome.wood': ['#F1E5D2', '#D6BE97'],
  'pomo.ocean': ['#2E7D8A', '#D97757'],
  'pomo.lavender': ['#8A63C4', '#3E8E85'],
  'pomo.rose': ['#C25B6E', '#6E9E62'],
  'pomo.candy': ['#E05C8A', '#5CA8E0'],
}

const SLOT_SECTIONS = [
  { slot: 'BACKGROUND', title: '배경 & 주요 색상' },
  { slot: 'CHROME', title: '사이드바 & 상단바' },
  { slot: 'POMODORO', title: '뽀모도로' },
  { slot: 'PLANET', title: '행성' },
  { slot: 'CELEBRATION', title: '완료 축하' },
  { slot: 'STATION', title: '우주정거장' },
]

const SPRITE_MAP_BY_SLOT = {
  PLANET: PLANET_SPRITES,
  CELEBRATION: CELEBRATION_SPRITES,
  STATION: STATION_SPRITES,
}

function TierBadge({ tier }) {
  if (tier === 'CONCEPT') {
    return (
      <span
        className="font-dungeon text-[11px] rounded-md px-2 py-0.5 border flex-shrink-0"
        style={{
          borderColor: 'var(--starlight)',
          color: 'var(--starlight)',
          background: 'color-mix(in srgb, var(--starlight) 16%, var(--card))',
        }}
      >
        컨셉
      </span>
    )
  }
  if (tier === 'COLOR') {
    return <span className="chip-retro flex-shrink-0">컬러</span>
  }
  return null
}

function SwatchPreview({ code }) {
  const colors = SKIN_PREVIEWS[code] || []
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      {colors.map((color, i) => (
        <span
          key={i}
          className="w-7 h-7 rounded-lg border border-line"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  )
}

function ItemPreview({ item }) {
  if (['BACKGROUND', 'CHROME', 'POMODORO'].includes(item.slot)) {
    return <SwatchPreview code={item.code} />
  }
  const map = item.type === 'STICKER' ? STICKER_SPRITES : SPRITE_MAP_BY_SLOT[item.slot]
  const sprite = spriteFor(map || {}, item.code)
  if (!sprite) return null
  return (
    <img
      src={sprite.img}
      alt=""
      className="w-10 h-10 object-contain flex-shrink-0"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

function ShopItemCard({ item, coinBalance, busyCode, onBuyClick, onEquip, onUnequip, onPreview, previewBusy }) {
  const insufficientCoins = !item.owned && coinBalance < item.price
  const isBusy = busyCode === item.code

  return (
    <div className="card-retro flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <ItemPreview item={item} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-galmuri font-bold text-sm text-dark truncate">{item.name}</p>
            <TierBadge tier={item.type === 'STICKER' ? null : item.tier} />
          </div>
          {item.description && (
            <p className="mt-0.5 text-xs font-semibold text-sub leading-snug">{item.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mt-auto pt-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <img src={coinImage} alt="" className="w-4 h-4 object-contain" />
            <span className="font-dungeon text-sm text-dark">{item.price}</span>
          </div>
          {item.slot === 'CELEBRATION' && onPreview && (
            <button
              type="button"
              onClick={() => onPreview(item)}
              disabled={previewBusy}
              className="text-[11px] font-bold underline text-sub hover:text-dark disabled:opacity-50 disabled:no-underline"
            >
              미리보기
            </button>
          )}
        </div>

        {!item.owned && (
          insufficientCoins ? (
            <button
              type="button"
              disabled
              className="btn-retro text-xs px-3 py-2 opacity-50 cursor-not-allowed"
            >
              코인 부족
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onBuyClick(item)}
              className="btn-retro-primary text-xs px-3 py-2"
            >
              구매
            </button>
          )
        )}

        {item.owned && item.type === 'THEME' && !item.equipped && (
          <button
            type="button"
            onClick={() => onEquip(item)}
            disabled={isBusy}
            className="btn-retro-secondary text-xs px-3 py-2"
          >
            {isBusy ? '...' : '장착하기'}
          </button>
        )}

        {item.owned && item.type === 'THEME' && item.equipped && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onUnequip(item)}
              disabled={isBusy}
              className="btn-retro text-[11px] px-2 py-1.5"
            >
              {isBusy ? '...' : '기본으로'}
            </button>
            <button
              type="button"
              disabled
              className="btn-retro text-xs px-3 py-2 opacity-70 cursor-not-allowed"
            >
              장착중
            </button>
          </div>
        )}

        {item.owned && item.type === 'STICKER' && (
          <button
            type="button"
            disabled
            className="btn-retro text-xs px-3 py-2 opacity-70 cursor-not-allowed"
          >
            보유중
          </button>
        )}
      </div>
    </div>
  )
}

function PurchaseConfirmModal({ item, coinBalance, submitting, error, onConfirm, onCancel }) {
  if (!item) return null
  const remaining = coinBalance - item.price

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overlay-retro px-4"
      onClick={() => !submitting && onCancel()}
    >
      <div className="card-retro w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-dungeon text-dark text-lg">{item.name}</h2>
        <p className="mt-3 text-sm font-bold text-dark">
          <span className="font-dungeon text-secondary">{item.price}</span>코인으로 구매할까요?
        </p>
        <p className="mt-1 text-xs font-semibold text-sub">구매 후 잔액 {remaining}코인</p>

        {error && (
          <p className="mt-3 text-xs font-bold" style={{ color: 'var(--danger)' }}>{error}</p>
        )}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="btn-retro flex-1 py-2 text-sm"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="btn-retro-primary flex-1 py-2 text-sm"
          >
            {submitting ? '구매 중...' : '구매하기'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function ShopPage() {
  const { refreshCoins } = useAuth()
  const [catalog, setCatalog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [busyCode, setBusyCode] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [confirmItem, setConfirmItem] = useState(null)
  const [confirmSubmitting, setConfirmSubmitting] = useState(false)
  const [confirmError, setConfirmError] = useState(null)
  const [previewCode, setPreviewCode] = useState(null)

  const fetchCatalog = useCallback(() => {
    return api.get('/shop/catalog')
      .then((res) => { setCatalog(res.data); setLoadError(null) })
      .catch((err) => setLoadError(getApiErrorMessage(err, '코인샵을 불러오지 못했어요.')))
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchCatalog().finally(() => setLoading(false))
  }, [fetchCatalog])

  const afterAction = async () => {
    setActionError(null)
    await fetchCatalog()
    refreshCoins()
    window.dispatchEvent(new CustomEvent('dumpit:catalog-updated'))
  }

  const handleBuyClick = (item) => {
    setConfirmError(null)
    setConfirmItem(item)
  }

  const handleConfirmPurchase = async () => {
    if (!confirmItem) return
    setConfirmSubmitting(true)
    setConfirmError(null)
    try {
      await api.post('/shop/purchase', { code: confirmItem.code })
      setConfirmItem(null)
      await afterAction()
    } catch (err) {
      setConfirmError(getApiErrorMessage(err, '구매에 실패했어요.'))
    } finally {
      setConfirmSubmitting(false)
    }
  }

  const handleEquip = async (item) => {
    setBusyCode(item.code)
    setActionError(null)
    try {
      await api.put('/shop/equip', { code: item.code })
      await afterAction()
    } catch (err) {
      setActionError(getApiErrorMessage(err, '장착에 실패했어요.'))
    } finally {
      setBusyCode(null)
    }
  }

  const handleUnequip = async (item) => {
    setBusyCode(item.code)
    setActionError(null)
    try {
      await api.delete(`/shop/equip/${item.slot}`)
      await afterAction()
    } catch (err) {
      setActionError(getApiErrorMessage(err, '해제에 실패했어요.'))
    } finally {
      setBusyCode(null)
    }
  }

  const handlePreview = (item) => {
    if (previewCode) return // 재생 중이면 연타 무시
    setPreviewCode(item.code)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="font-bold text-sub">불러오는 중...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="card-retro text-center">
          <p className="font-black text-dark">코인샵을 불러오지 못했어요</p>
          <p className="mt-2 text-xs font-semibold text-sub">{loadError}</p>
          <button
            type="button"
            onClick={() => { setLoading(true); fetchCatalog().finally(() => setLoading(false)) }}
            className="btn-retro mt-4 text-sm"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  const items = catalog?.items || []
  const coinBalance = catalog?.coinBalance ?? 0
  const stickers = items.filter((item) => item.type === 'STICKER')

  const cardProps = {
    coinBalance,
    busyCode,
    onBuyClick: handleBuyClick,
    onEquip: handleEquip,
    onUnequip: handleUnequip,
    onPreview: handlePreview,
    previewBusy: Boolean(previewCode),
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-dungeon text-dark text-2xl">코인샵</h2>
        <div className="flex items-center gap-1.5 bg-chip border border-line rounded-full px-3 py-1.5">
          <img src={coinImage} alt="" className="w-5 h-5 object-contain" />
          <span className="font-dungeon text-lg text-dark">{coinBalance}</span>
        </div>
      </div>

      {actionError && (
        <p className="text-xs font-bold text-center" style={{ color: 'var(--danger)' }}>{actionError}</p>
      )}

      {SLOT_SECTIONS.map(({ slot, title }) => {
        const slotItems = items.filter((item) => item.slot === slot)
        if (slotItems.length === 0) return null
        return (
          <section key={slot}>
            <h3 className="label-retro mb-3">{title}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {slotItems.map((item) => (
                <ShopItemCard key={item.code} item={item} {...cardProps} />
              ))}
            </div>
          </section>
        )
      })}

      {stickers.length > 0 && (
        <section>
          <h3 className="label-retro mb-3">스티커</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stickers.map((item) => (
              <ShopItemCard key={item.code} item={item} {...cardProps} />
            ))}
          </div>
        </section>
      )}

      <p className="text-[11px] text-sub text-center pt-4 border-t border-line">
        픽셀 아트: peony (CC-BY 4.0) · Master484 · Dizzy Crow · stealthix · KerteX_
      </p>

      <PurchaseConfirmModal
        item={confirmItem}
        coinBalance={coinBalance}
        submitting={confirmSubmitting}
        error={confirmError}
        onConfirm={handleConfirmPurchase}
        onCancel={() => {
          if (confirmSubmitting) return
          setConfirmItem(null)
          setConfirmError(null)
        }}
      />

      {previewCode && (
        <RocketLaunch codeOverride={previewCode} onDone={() => setPreviewCode(null)} />
      )}
    </div>
  )
}
