import { useState, useEffect } from 'react'
import api from '../services/api'

const DEFAULT_START = 9
const DEFAULT_END = 22

export default function SettingsModal({ onClose }) {
  const [routineStart, setRoutineStart] = useState(() => {
    const v = localStorage.getItem('dumpit_routine_start')
    return v ? Number(v) : DEFAULT_START
  })
  const [routineEnd, setRoutineEnd] = useState(() => {
    const v = localStorage.getItem('dumpit_routine_end')
    return v ? Number(v) : DEFAULT_END
  })
  const [purchases, setPurchases] = useState([])
  const [loadingPurchases, setLoadingPurchases] = useState(true)

  useEffect(() => {
    api.get('/shop/items')
      .then((res) => setPurchases(res.data.filter((i) => i.isOwned)))
      .catch(() => setPurchases([]))
      .finally(() => setLoadingPurchases(false))
  }, [])

  const saveRoutine = () => {
    localStorage.setItem('dumpit_routine_start', routineStart)
    localStorage.setItem('dumpit_routine_end', routineEnd)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/40" onClick={onClose}>
      <div
        className="card-kitschy w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="heading-kitschy text-xl">설정</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border-2 border-dark font-black text-dark hover:bg-primary hover:text-white transition-colors"
          >
            X
          </button>
        </div>

        <section className="mb-6">
          <h3 className="font-extrabold text-dark text-sm mb-3">일과 시간</h3>
          <p className="text-xs text-dark/50 font-medium mb-3">
            시간표에 표시되는 루틴 시간대를 설정하세요
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-dark/60">시작</label>
              <select
                value={routineStart}
                onChange={(e) => setRoutineStart(Number(e.target.value))}
                className="text-sm font-bold border-2 border-dark rounded-lg px-2 py-1.5 bg-white"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{h}시</option>
                ))}
              </select>
            </div>
            <span className="font-bold text-dark/40">~</span>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-dark/60">종료</label>
              <select
                value={routineEnd}
                onChange={(e) => setRoutineEnd(Number(e.target.value))}
                className="text-sm font-bold border-2 border-dark rounded-lg px-2 py-1.5 bg-white"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{h}시</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <hr className="border-dark/10 mb-6" />

        <section className="mb-6">
          <h3 className="font-extrabold text-dark text-sm mb-3">보유 아이템</h3>
          {loadingPurchases ? (
            <p className="text-xs text-dark/40 font-medium">불러오는 중...</p>
          ) : purchases.length === 0 ? (
            <p className="text-xs text-dark/40 font-medium">
              아직 구매한 아이템이 없어요. 코인샵에서 구매해보세요!
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {purchases.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 border-dark/10 bg-accent"
                >
                  <div
                    className="w-10 h-10 rounded-lg border-2 border-dark"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[10px] font-bold text-dark text-center leading-tight">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="btn-kitschy flex-1 bg-accent text-dark text-sm"
          >
            취소
          </button>
          <button
            onClick={saveRoutine}
            className="btn-kitschy flex-1 bg-primary text-white text-sm"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
