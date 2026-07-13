// 픽셀 행성 궤도 진행률 링 — 오늘 완료 비율만큼 궤도가 액센트 호로 채워진다
// 크기는 --orbit-size(clamp)로 뷰포트 비례: 모바일 64px ~ 데스크톱 120px.
// 엔드포인트가 rem이라 글자 크기 설정(루트 font-size)과도 연동된다.
import { useAuth } from '../context/AuthContext'
import { PLANET_SPRITES, spriteFor } from '../shop/registry'

const VB = 64                 // viewBox 좌표계 — 기존 고정 64px 시절 수치를 그대로 유지
const R = VB / 2 - 3
const C = 2 * Math.PI * R

export default function OrbitProgress({ done, total }) {
  const { user } = useAuth()
  const frac = total > 0 ? Math.min(done / total, 1) : 0
  return (
    <div
      className="flex-none text-center"
      style={{ '--orbit-size': 'clamp(4rem, 8vw + 1rem, 7.5rem)', width: 'calc(var(--orbit-size) + 8px)' }}
    >
      <div className="relative mx-auto" style={{ width: 'var(--orbit-size)', height: 'var(--orbit-size)' }}>
        <svg viewBox={`0 0 ${VB} ${VB}`} width="100%" height="100%" className="-rotate-90">
          <circle
            cx={VB / 2} cy={VB / 2} r={R} fill="none"
            stroke="var(--line)" strokeWidth="1.5" strokeDasharray="2 4"
          />
          <circle
            cx={VB / 2} cy={VB / 2} r={R} fill="none"
            stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray={`${frac * C} ${C}`}
          />
        </svg>
        <img
          src={spriteFor(PLANET_SPRITES, user?.equipments?.PLANET).img}
          alt=""
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            imageRendering: 'pixelated',
            width: 'calc(var(--orbit-size) * 0.34375)',
            height: 'calc(var(--orbit-size) * 0.34375)',
          }}
        />
        <div className="orbit-sat" aria-hidden="true" style={{ '--orbit-r': 'calc(var(--orbit-size) * 0.453)' }} />
      </div>
      <p className="text-xs text-sub mt-1.5 whitespace-nowrap">
        오늘 <span className="font-dungeon text-secondary text-sm">{done}/{total}</span>
      </p>
    </div>
  )
}
