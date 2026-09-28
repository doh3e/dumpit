import { useState } from 'react'
import Dialog from './Dialog'
import PixelSprite from './PixelSprite'
import { stationSpriteFor } from '../shop/registry'

export default function PetVariantDialog({ item, coinBalance, busy, error, onClose, onBuy, onEquip }) {
  const variants = item.variants ?? []
  const [selected, setSelected] = useState(() =>
    variants.find(v => v.code === item.selectedVariant)?.code ?? variants[0]?.code
  )
  const [action, setAction] = useState('idle')
  const selectedName = variants.find(v => v.code === selected)?.name ?? item.name
  const insufficientCoins = !item.owned && coinBalance < item.price

  return (
    <Dialog onClose={() => !busy && onClose()} title={item.name} closeOnBackdrop={!busy} className="w-full max-w-md p-5" variant="refined">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-galmuri text-lg font-bold text-dark break-words">{item.name}</h2>
          {variants.length > 0 && <p className="mt-1 text-xs font-semibold text-sub">{variants.length}종 모두 포함 · 언제든 변경 가능</p>}
        </div>
        <button type="button" onClick={onClose} disabled={busy} aria-label="닫기" className="btn-refined btn-refined-text !h-11 !w-11 !p-0 flex-shrink-0">X</button>
      </div>

      <div className="my-4 flex flex-col items-center gap-3">
        <PixelSprite sprite={stationSpriteFor(item.code, selected, action)} className="w-32 h-32" />
        <p className="text-sm font-bold text-dark" aria-live="polite">{selectedName}</p>
        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="미리보기 동작">
          <button type="button" aria-pressed={action === 'idle'} onClick={() => setAction('idle')} className={`btn-refined text-xs ${action === 'idle' ? 'btn-refined-selected' : 'btn-refined-text'}`}>대기</button>
          <button type="button" aria-pressed={action === 'action'} onClick={() => setAction('action')} className={`btn-refined text-xs ${action === 'action' ? 'btn-refined-selected' : 'btn-refined-text'}`}>다른 동작</button>
        </div>
      </div>

      {variants.length > 0 && (
        <div role="group" aria-label="외형 선택" className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {variants.map(variant => (
            <button key={variant.code} type="button" aria-label={variant.name} aria-pressed={selected === variant.code} disabled={busy}
              onClick={() => setSelected(variant.code)}
              className={`btn-refined min-w-0 flex flex-col items-center gap-1 !p-2 ${selected === variant.code ? 'btn-refined-selected' : ''}`}>
              <PixelSprite sprite={stationSpriteFor(item.code, variant.code)} className="w-16 h-16 flex-shrink-0" />
              <span className="text-xs break-words">{selected === variant.code && <span aria-hidden="true">✓ </span>}{variant.name}</span>
            </button>
          ))}
        </div>
      )}
      {variants.length === 0 && <p className="text-xs font-semibold text-sub text-center">{item.description}</p>}
      {error && <p role="alert" className="mt-3 text-xs font-bold" style={{ color: 'var(--danger-text)' }}>{error}</p>}
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={onClose} disabled={busy} className="btn-refined flex-1 text-sm">취소</button>
        {item.owned ? (
          <button type="button" disabled={busy} onClick={() => onEquip(item, selected)} className="btn-refined btn-refined-primary flex-1 text-sm">
            {busy ? '장착 중...' : '이 모습으로 장착'}
          </button>
        ) : (
          <button type="button" disabled={busy || insufficientCoins} onClick={() => onBuy({ ...item, selectedVariant: selected })} className="btn-refined btn-refined-primary flex-1 text-sm">
            {insufficientCoins ? '코인 부족' : `${item.price.toLocaleString('ko-KR')}코인으로 구매`}
          </button>
        )}
      </div>
    </Dialog>
  )
}
