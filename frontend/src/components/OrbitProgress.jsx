// 픽셀 행성 궤도 진행률 링 — 오늘 완료 비율만큼 궤도가 액센트 호로 채워진다
import { useAuth } from '../context/AuthContext'
import { PLANET_SPRITES, spriteFor } from '../shop/registry'

export default function OrbitProgress({ done, total, size = 64 }) {
  const { user } = useAuth()
  const r = (size / 2) - 3
  const c = 2 * Math.PI * r
  const frac = total > 0 ? Math.min(done / total, 1) : 0
  return (
    <div className="flex-none text-center" style={{ width: size + 8 }}>
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke="var(--line)" strokeWidth="1.5" strokeDasharray="2 4"
          />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray={`${frac * c} ${c}`}
          />
        </svg>
        <img
          src={spriteFor(PLANET_SPRITES, user?.equipments?.PLANET).img}
          alt=""
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[22px] h-[22px]"
          style={{ imageRendering: 'pixelated' }}
        />
        <div className="orbit-sat" aria-hidden="true" style={{ '--orbit-r': `${r}px` }} />
      </div>
      <p className="text-[0.6875rem] text-sub mt-1.5 whitespace-nowrap">
        오늘 <span className="font-dungeon text-secondary text-xs">{done}/{total}</span>
      </p>
    </div>
  )
}
