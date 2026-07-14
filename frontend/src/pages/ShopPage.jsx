import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import api, { getApiErrorMessage } from '../services/api'
import coinImage from '../assets/coin_image.png'
import { useAuth } from '../context/AuthContext'
import RocketLaunch from '../components/RocketLaunch'
import PixelSprite from '../components/PixelSprite'
import { applySkinsTransient, applyCachedSkins } from '../shop/applySkins'
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
  'bg.wood': ['#F1E5D2', '#A8763E', '#E7D5B8'],
  'bg.candy': ['#F7E7EE', '#E05C8A', '#F2D7E2'],
  'chrome.ocean': ['#E4EFEC', '#B7D4CD'],
  'chrome.lavender': ['#EEEAF4', '#CBBEDC'],
  'chrome.rose': ['#F5E9EA', '#DDBCC2'],
  'chrome.wood': ['#F1E5D2', '#D6BE97'],
  'chrome.sprout': ['#EAF2E3', '#C2DBAA'],
  'chrome.galaxy': ['#E9EAF6', '#C2C5E4'],
  'chrome.candy': ['#F7E7EE', '#E5BCCE'],
  'pomo.ocean': ['#2E7D8A', '#D97757'],
  'pomo.lavender': ['#8A63C4', '#3E8E85'],
  'pomo.rose': ['#C25B6E', '#6E9E62'],
  'pomo.candy': ['#E05C8A', '#5CA8E0'],
  'pomo.sprout': ['#5C8A3C', '#C4708F'],
  'pomo.galaxy': ['#6D74C9', '#C9922E'],
  'pomo.wood': ['#A8763E', '#5C8A6E'],
}

// 라이브 미리보기(dataset) 가능한 CSS 슬롯 — 스프라이트 슬롯은 모달 미리보기(Task 4)
const LIVE_PREVIEW_SLOTS = ['BACKGROUND', 'CHROME', 'POMODORO']

const SLOT_SECTIONS = [
  { slot: 'BACKGROUND', title: '배경 & 주요 색상' },
  { slot: 'CHROME', title: '사이드바 & 상단바' },
  { slot: 'POMODORO', title: '뽀모도로' },
  { slot: 'PLANET', title: '행성' },
  { slot: 'CELEBRATION', title: '완료 축하' },
  { slot: 'STATION', title: '우주정거장' },
]

// 카탈로그 45종을 한 화면에 다 펼치면 스크롤이 지나치게 길다 — 섹션별 탭 분리
const SHOP_TABS = [
  ...SLOT_SECTIONS.map(({ slot, title }) => ({ id: slot, label: title })),
  { id: 'STICKER', label: '스티커' },
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
        className="font-dungeon text-[0.6875rem] rounded-md px-2 py-0.5 border flex-shrink-0"
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
  if (LIVE_PREVIEW_SLOTS.includes(item.slot)) {
    return <SwatchPreview code={item.code} />
  }
  const map = item.type === 'STICKER' ? STICKER_SPRITES : SPRITE_MAP_BY_SLOT[item.slot]
  const sprite = spriteFor(map || {}, item.code)
  if (!sprite) return null
  return <PixelSprite sprite={sprite} className="w-10 h-10 object-contain flex-shrink-0" />
}

function ShopItemCard({ item, coinBalance, busyCode, onBuyClick, onEquip, onUnequip, onPreview, previewBusy, previews, onLivePreviewToggle, onSpritePreview }) {
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
            {/* 아직 안 산 아이템의 가격은 테마와 무관하게 붉은색 고정 — 지불할 금액이 한눈에 띄게 */}
            <span
              className="font-dungeon text-sm text-dark"
              style={item.owned ? undefined : { color: 'var(--danger)' }}
            >
              {item.price}
            </span>
          </div>
          {item.slot === 'CELEBRATION' && onPreview && (
            <button
              type="button"
              onClick={() => onPreview(item)}
              disabled={previewBusy}
              className="text-[0.6875rem] font-bold underline text-sub hover:text-dark disabled:opacity-50 disabled:no-underline"
            >
              미리보기
            </button>
          )}
          {LIVE_PREVIEW_SLOTS.includes(item.slot) && !item.equipped && onLivePreviewToggle && (
            <button
              type="button"
              onClick={() => onLivePreviewToggle(item)}
              className="text-[0.6875rem] font-bold underline text-sub hover:text-dark"
            >
              {previews?.[item.slot] === item.code ? '미리보기 취소' : '미리보기'}
            </button>
          )}
          {['PLANET', 'STATION'].includes(item.slot) && onSpritePreview && (
            <button
              type="button"
              onClick={() => onSpritePreview(item)}
              className="text-[0.6875rem] font-bold underline text-sub hover:text-dark"
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
            className="btn-retro-outline text-xs px-3 py-2"
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
              className="btn-retro text-[0.6875rem] px-2 py-1.5"
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
          <span className="font-dungeon" style={{ color: 'var(--danger)' }}>{item.price}</span>코인으로 구매할까요?
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

// 행성·우주정거장은 상점 화면에 렌더 위치가 없어(대시보드/마이페이지) 확대 모달로 미리보기
function SpritePreviewModal({ item, onClose }) {
  if (!item) return null
  const sprite = spriteFor(SPRITE_MAP_BY_SLOT[item.slot] || {}, item.code)
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overlay-retro px-4"
      onClick={onClose}
    >
      <div className="card-retro w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <h2 className="font-dungeon text-dark text-lg">{item.name}</h2>
            <TierBadge tier={item.tier} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex-shrink-0 rounded-lg border border-line font-black text-sub text-xs hover:bg-chip transition-colors"
          >
            X
          </button>
        </div>
        <div className="my-6 flex items-center justify-center">
          <PixelSprite sprite={sprite} className="w-32 h-32 sm:w-40 sm:h-40 object-contain" />
        </div>
        {item.description && (
          <p className="text-xs font-semibold text-sub leading-snug text-center">{item.description}</p>
        )}
      </div>
    </div>,
    document.body
  )
}

export default function ShopPage() {
  const { user, refreshCoins } = useAuth()
  const [catalog, setCatalog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [busyCode, setBusyCode] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [confirmItem, setConfirmItem] = useState(null)
  const [confirmSubmitting, setConfirmSubmitting] = useState(false)
  const [confirmError, setConfirmError] = useState(null)
  const [previewCode, setPreviewCode] = useState(null)
  const [previews, setPreviews] = useState({})
  const [spritePreviewItem, setSpritePreviewItem] = useState(null)
  const [activeTab, setActiveTab] = useState(SHOP_TABS[0].id)

  const fetchCatalog = useCallback(() => {
    return api.get('/shop/catalog')
      .then((res) => { setCatalog(res.data); setLoadError(null) })
      .catch((err) => setLoadError(getApiErrorMessage(err, '코인샵을 불러오지 못했어요.')))
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchCatalog().finally(() => setLoading(false))
  }, [fetchCatalog])

  // 미리보기 합성 적용. user 의존이 핵심 — refreshCoins/창 포커스 재검증이
  // applySkins(실제)로 dataset을 덮어써도 setUser 리렌더 후 여기가 미리보기를 재적용한다.
  // previews가 비면 실제 장착이 그대로 적용되므로 해제 원복에 별도 분기 불필요.
  useEffect(() => {
    if (!user) return
    applySkinsTransient({ ...(user.equipments || {}), ...previews })
  }, [user, previews])

  // 상점 이탈(언마운트) 시 실제 장착 상태로 원복 — 캐시는 미리보기에 오염되지 않으므로 신뢰 가능
  useEffect(() => () => applyCachedSkins(), [])

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
      clearSlotPreview(item.slot)
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
      clearSlotPreview(item.slot)
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

  const handleLivePreviewToggle = (item) => {
    setPreviews((prev) => {
      const next = { ...prev }
      if (next[item.slot] === item.code) delete next[item.slot]
      else next[item.slot] = item.code
      return next
    })
  }

  const clearSlotPreview = (slot) => {
    setPreviews((prev) => {
      if (!(slot in prev)) return prev
      const next = { ...prev }
      delete next[slot]
      return next
    })
  }

  const clearAllPreviews = () => setPreviews({})

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
  // 섹션 내 정렬: 가격 오름차순 → 이름 오름차순 (같은 컨셉 테마가 슬롯마다 흩어져 보이는 문제 방지)
  const byPriceThenName = (a, b) => (a.price - b.price) || a.name.localeCompare(b.name, 'ko')
  const activeItems = items
    .filter((item) => (activeTab === 'STICKER' ? item.type === 'STICKER' : item.slot === activeTab))
    .sort(byPriceThenName)
  // 탭 안에서 보유중을 위, 미구매를 아래로 — 각 그룹은 가격·이름순 유지
  const ownedItems = activeItems.filter((item) => item.owned)
  const unownedItems = activeItems.filter((item) => !item.owned)
  const showOwnedSplit = ownedItems.length > 0 && unownedItems.length > 0

  const cardProps = {
    coinBalance,
    busyCode,
    onBuyClick: handleBuyClick,
    onEquip: handleEquip,
    onUnequip: handleUnequip,
    onPreview: handlePreview,
    previewBusy: Boolean(previewCode),
    previews,
    onLivePreviewToggle: handleLivePreviewToggle,
    onSpritePreview: setSpritePreviewItem,
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

      <div role="tablist" className="flex flex-wrap gap-2">
        {SHOP_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`font-dungeon text-sm px-3.5 py-2 rounded-full border-[1.5px] transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-on-accent border-edge shadow-retro'
                : 'bg-card text-dark border-line hover:border-edge'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {actionError && (
        <p className="text-xs font-bold text-center" style={{ color: 'var(--danger)' }}>{actionError}</p>
      )}

      {(showOwnedSplit
        ? [
            { key: 'owned', label: '보유중', list: ownedItems },
            { key: 'unowned', label: '구매 가능', list: unownedItems },
          ]
        : [{ key: 'all', label: null, list: activeItems }]
      ).map(({ key, label, list }) => (
        <section key={key}>
          {label && (
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-dungeon text-sm text-dark">{label}</h3>
              <span className="chip-retro">{list.length}</span>
              <span aria-hidden className="flex-1 divider-retro" />
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((item) => (
              <ShopItemCard key={item.code} item={item} {...cardProps} />
            ))}
          </div>
        </section>
      ))}

      <p className="text-[0.6875rem] text-sub text-center pt-4 border-t border-line">
        픽셀 아트: peony (CC-BY 4.0) · stealthix · KerteX_
      </p>

      {Object.keys(previews).length > 0 && (
        <div className="fixed bottom-6 left-4 right-24 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:max-w-lg z-40">
          <div className="card-retro flex items-center gap-3 px-4 py-2.5">
            <span aria-hidden>👁</span>
            <p className="text-xs font-bold text-dark truncate flex-1">
              미리보기 중: {Object.values(previews)
                .map((code) => items.find((i) => i.code === code)?.name)
                .filter(Boolean)
                .join(', ')}
            </p>
            <button
              type="button"
              onClick={clearAllPreviews}
              className="btn-retro text-[0.6875rem] px-2.5 py-1.5 flex-shrink-0"
            >
              전체 해제
            </button>
          </div>
        </div>
      )}

      <SpritePreviewModal item={spritePreviewItem} onClose={() => setSpritePreviewItem(null)} />

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
