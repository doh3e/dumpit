import { createPortal } from 'react-dom'

const AI_COSTS = [
  { label: '일일 총 한도', cost: '100점', highlight: true },
  { label: '태스크 추가 및 AI 분석', cost: '1점' },
  { label: '우선순위 재분석', cost: '1점' },
  { label: '서브태스크 제안', cost: '3점' },
  { label: '브레인 덤프 분석', cost: '5점' },
  { label: '그 외 모든 활동', cost: '무료' },
]

const FEATURES = [
  { icon: '📋', title: '대시보드', desc: '태스크를 등록하면 AI가 우선순위를 분석해줘요. 등록한 태스크는 마감 시간과 우선순위에 따라 하루일과표에 등록돼요.' },
  { icon: '🧠', title: '브레인 덤프', desc: '머릿속의 생각을 그대로 쏟아내면 AI가 각각의 독립된 태스크로 변환해줘요.' },
  { icon: '💡', title: '아이디어 덤프', desc: '아이디어를 계층 구조로 기록하고 관리해요.' },
  { icon: '🔁', title: '루틴', desc: '반복 일정을 설정하면 매일 자동으로 태스크가 생성돼요.' },
  { icon: '🍅', title: '포모도로 타이머', desc: '정해둔 시간만큼 집중 후 휴식! 완료 시 코인을 획득해요.' },
]

export default function HelpModal({ onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-dark/50" onClick={onClose} />
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto card-kitschy"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="heading-kitschy text-base text-dark">Dumpit! 도움말</h2>
            <p className="text-xs font-bold text-dark/50 mt-0.5">현재 베타 서비스 중이에요</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border-2 border-dark font-black text-dark hover:bg-primary hover:text-white transition-colors flex-shrink-0 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="mb-5 rounded-lg border-2 border-secondary bg-secondary/10 px-4 py-3">
          <p className="text-xs font-black text-secondary mb-1">🎉 베타 서비스 안내</p>
          <p className="text-xs font-semibold text-dark/70 leading-relaxed">
            Dumpit!은 현재 베타 서비스 중이에요. 모든 활동이 무료인 대신,
            AI를 활용하는 기능에는 일일 사용량 제한이 있습니다.
          </p>
        </div>

        <h3 className="text-sm font-black text-dark mb-2">주요 기능</h3>
        <div className="space-y-2 mb-5">
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="flex gap-3 rounded-lg border border-dark/10 bg-white px-3 py-2">
              <span className="text-base flex-shrink-0">{icon}</span>
              <div>
                <p className="text-xs font-black text-dark">{title}</p>
                <p className="text-[11px] font-semibold text-dark/60 leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <h3 className="text-sm font-black text-dark mb-2">⚡ 일일 AI 사용량 안내</h3>
        <div className="rounded-lg border-2 border-dark/10 overflow-hidden mb-1">
          {AI_COSTS.map(({ label, cost, highlight }) => (
            <div
              key={label}
              className={`flex items-center justify-between px-3 py-2 border-b border-dark/10 last:border-0 ${
                highlight ? 'bg-dark' : 'bg-white'
              }`}
            >
              <span className={`text-xs ${highlight ? 'font-black text-white' : 'font-semibold text-dark/70'}`}>
                {label}
              </span>
              <span className={`text-xs font-black ${highlight ? 'text-white' : 'text-dark'}`}>{cost}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] font-semibold text-dark/50 mb-5">매일 자정(KST)에 초기화돼요.</p>

        <button onClick={onClose} className="w-full btn-kitschy text-sm">
          확인했어요!
        </button>
      </div>
    </div>,
    document.body
  )
}
