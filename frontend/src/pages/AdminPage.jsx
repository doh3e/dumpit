import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'

const STATUS_LABEL = {
  PENDING: { label: '대기 중', color: 'bg-yellow-100 text-yellow-700 border-yellow-400' },
  REPLIED: { label: '답변 완료', color: 'bg-green-100 text-green-700 border-green-400' },
  CLOSED: { label: '종료', color: 'bg-gray-100 text-gray-600 border-gray-400' },
}

const USER_STATUS = {
  ACTIVE: { label: '활성', color: 'bg-green-100 text-green-700 border-green-400' },
  BANNED: { label: '밴', color: 'bg-red-100 text-red-700 border-red-400' },
  WITHDRAWN: { label: '탈퇴', color: 'bg-gray-100 text-gray-600 border-gray-400' },
}

function formatDate(value) {
  if (!value) return '-'
  const date = Array.isArray(value)
    ? new Date(value[0], (value[1] || 1) - 1, value[2] || 1, value[3] || 0, value[4] || 0, value[5] || 0)
    : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
}

function StatPill({ label, value }) {
  return (
    <div className="rounded-lg border-2 border-dark/10 bg-white px-3 py-2">
      <p className="text-[10px] font-black text-dark/40">{label}</p>
      <p className="mt-0.5 text-lg font-black text-dark">{value}</p>
    </div>
  )
}

export default function AdminPage() {
  const [tab, setTab] = useState('inquiries')
  const [inquiries, setInquiries] = useState([])
  const [users, setUsers] = useState([])
  const [loadingInquiries, setLoadingInquiries] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [selected, setSelected] = useState(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [workingUserId, setWorkingUserId] = useState(null)

  const fetchInquiries = () => {
    setLoadingInquiries(true)
    api.get('/admin/inquiries')
      .then((res) => setInquiries(Array.isArray(res.data) ? res.data : []))
      .catch(() => setInquiries([]))
      .finally(() => setLoadingInquiries(false))
  }

  const fetchUsers = () => {
    setLoadingUsers(true)
    api.get('/admin/users')
      .then((res) => setUsers(Array.isArray(res.data) ? res.data : []))
      .catch(() => setUsers([]))
      .finally(() => setLoadingUsers(false))
  }

  useEffect(() => {
    fetchInquiries()
    fetchUsers()
  }, [])

  const userStats = useMemo(() => ({
    total: users.length,
    active: users.filter((user) => user.status === 'ACTIVE').length,
    banned: users.filter((user) => user.status === 'BANNED').length,
    withdrawn: users.filter((user) => user.status === 'WITHDRAWN').length,
  }), [users])

  const openInquiry = (inquiry) => {
    setSelected(inquiry)
    setReply(inquiry.adminReply || '')
  }

  const handleSendReply = async () => {
    if (!reply.trim() || !selected) return
    setSending(true)
    try {
      await api.patch(`/admin/inquiries/${selected.inquiryId}/reply`, { reply: reply.trim() })
      fetchInquiries()
      setSelected(null)
      setReply('')
    } catch {
      alert('답변 전송에 실패했어요.')
    } finally {
      setSending(false)
    }
  }

  const handleBan = async (user) => {
    const reason = window.prompt(`${user.email} 사용자를 밴할까요? 사유를 입력해주세요.`, user.banReason || '')
    if (reason === null) return
    setWorkingUserId(user.userId)
    try {
      await api.patch(`/admin/users/${user.userId}/ban`, { reason: reason.trim() })
      fetchUsers()
    } catch {
      alert('밴 처리에 실패했어요.')
    } finally {
      setWorkingUserId(null)
    }
  }

  const handleUnban = async (user) => {
    if (!window.confirm(`${user.email} 사용자의 밴을 해제할까요?`)) return
    setWorkingUserId(user.userId)
    try {
      await api.patch(`/admin/users/${user.userId}/unban`)
      fetchUsers()
    } catch {
      alert('밴 해제에 실패했어요.')
    } finally {
      setWorkingUserId(null)
    }
  }

  const pendingCount = inquiries.filter((inquiry) => inquiry.status === 'PENDING').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="heading-kitschy text-2xl">관리자</h2>
          <p className="mt-2 text-sm font-semibold text-dark/60">
            문의 {inquiries.length}건 · 대기 {pendingCount}건 · 회원 {users.length}명
          </p>
        </div>
        <div className="inline-flex rounded-lg border-2 border-dark bg-white p-1">
          {[
            ['inquiries', '문의'],
            ['users', '회원'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`rounded-md px-4 py-2 text-sm font-black transition-colors ${
                tab === value ? 'bg-primary text-white' : 'text-dark/60 hover:bg-accent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'inquiries' && (
        loadingInquiries ? (
          <div className="card-kitschy py-12 text-center">
            <p className="font-bold text-dark/50">불러오는 중...</p>
          </div>
        ) : inquiries.length === 0 ? (
          <div className="card-kitschy py-12 text-center">
            <p className="text-base font-extrabold text-dark">접수된 문의가 없어요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="card-kitschy">
              <h3 className="mb-4 font-extrabold text-dark">문의 목록</h3>
              <div className="max-h-[600px] space-y-2 overflow-y-auto pr-1">
                {inquiries.map((inquiry) => {
                  const status = STATUS_LABEL[inquiry.status] ?? STATUS_LABEL.PENDING
                  const isSelected = selected?.inquiryId === inquiry.inquiryId
                  return (
                    <button
                      key={inquiry.inquiryId}
                      type="button"
                      onClick={() => openInquiry(inquiry)}
                      className={`w-full rounded-lg border-2 p-3 text-left transition-colors ${
                        isSelected ? 'border-primary bg-primary/10' : 'border-dark/10 hover:border-dark/30'
                      }`}
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${status.color}`}>
                          {status.label}
                        </span>
                        <span className="text-[10px] font-bold text-dark/50">{formatDate(inquiry.createdAt)}</span>
                      </div>
                      <p className="truncate text-sm font-extrabold text-dark">{inquiry.subject}</p>
                      <p className="truncate text-xs font-semibold text-dark/60">{inquiry.userEmail}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="card-kitschy">
              <h3 className="mb-4 font-extrabold text-dark">상세 / 답변</h3>
              {!selected ? (
                <div className="py-12 text-center">
                  <p className="text-sm font-bold text-dark/50">왼쪽에서 문의를 선택해주세요.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2 rounded-lg border border-dark/10 bg-accent p-3">
                    <p className="text-xs">
                      <span className="font-bold text-dark/60">이메일:</span>{' '}
                      <a href={`mailto:${selected.userEmail}`} className="text-primary underline">
                        {selected.userEmail}
                      </a>
                    </p>
                    <p className="text-xs"><span className="font-bold text-dark/60">접수:</span> {formatDate(selected.createdAt)}</p>
                    <p className="text-xs"><span className="font-bold text-dark/60">제목:</span> <span className="font-extrabold text-dark">{selected.subject}</span></p>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-dark/60">문의 내용</label>
                    <pre className="whitespace-pre-wrap rounded-lg border-2 border-dark/10 bg-white p-3 text-sm font-medium text-dark">
                      {selected.message}
                    </pre>
                  </div>

                  {selected.status === 'REPLIED' && selected.adminReply && (
                    <div>
                      <label className="mb-1 block text-xs font-bold text-dark/60">
                        이전 답변 ({formatDate(selected.repliedAt)})
                      </label>
                      <pre className="whitespace-pre-wrap rounded-lg border-2 border-green-200 bg-green-50 p-3 text-sm font-medium text-dark">
                        {selected.adminReply}
                      </pre>
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-xs font-bold text-dark/60">
                      {selected.status === 'REPLIED' ? '답변 다시 보내기' : '답변 작성'}
                    </label>
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      rows={6}
                      maxLength={3000}
                      placeholder="답변 내용을 입력해주세요."
                      className="w-full resize-none rounded-lg border-2 border-dark bg-accent px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
                    />
                    <p className="mt-1 text-right text-[10px] font-bold text-dark/40">{reply.length} / 3000</p>
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setSelected(null)} className="btn-kitschy flex-1 bg-accent py-2 text-sm text-dark">
                      닫기
                    </button>
                    <button
                      type="button"
                      onClick={handleSendReply}
                      disabled={!reply.trim() || sending}
                      className="btn-kitschy flex-1 bg-secondary py-2 text-sm text-white disabled:opacity-50"
                    >
                      {sending ? '전송 중...' : '답변 전송'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {tab === 'users' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatPill label="전체 회원" value={userStats.total} />
            <StatPill label="활성" value={userStats.active} />
            <StatPill label="밴" value={userStats.banned} />
            <StatPill label="탈퇴" value={userStats.withdrawn} />
          </div>

          <div className="card-kitschy overflow-hidden !p-0">
            {loadingUsers ? (
              <div className="py-12 text-center">
                <p className="font-bold text-dark/50">불러오는 중...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="py-12 text-center">
                <p className="font-bold text-dark/50">회원이 없어요.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <thead className="bg-accent">
                    <tr className="border-b-2 border-dark/10 text-xs font-black text-dark/50">
                      <th className="px-4 py-3">회원</th>
                      <th className="px-4 py-3">상태</th>
                      <th className="px-4 py-3">가입일</th>
                      <th className="px-4 py-3">사유</th>
                      <th className="px-4 py-3 text-right">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const status = USER_STATUS[user.status] ?? USER_STATUS.ACTIVE
                      const disabled = user.isAdmin || user.status === 'WITHDRAWN' || workingUserId === user.userId
                      return (
                        <tr key={user.userId} className="border-b border-dark/10 last:border-0">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {user.picture ? (
                                <img src={user.picture} alt="" className="h-9 w-9 rounded-full border-2 border-dark object-cover" />
                              ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-dark bg-accent text-sm font-black text-dark">
                                  {(user.nickname || '?')[0]}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-dark">{user.nickname || '이름 없음'}</p>
                                <p className="truncate text-xs font-semibold text-dark/50">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${status.color}`}>
                              {user.isAdmin ? '관리자' : status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-dark/60">{formatDate(user.createdAt)}</td>
                          <td className="max-w-[220px] px-4 py-3 text-xs font-semibold text-dark/60">
                            <span className="line-clamp-2">{user.banReason || '-'}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {user.status === 'BANNED' ? (
                              <button
                                type="button"
                                onClick={() => handleUnban(user)}
                                disabled={disabled}
                                className="rounded-lg border-2 border-secondary bg-white px-3 py-1.5 text-xs font-black text-secondary shadow-kitschy disabled:opacity-40"
                              >
                                해제
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleBan(user)}
                                disabled={disabled}
                                className="rounded-lg border-2 border-red-500 bg-white px-3 py-1.5 text-xs font-black text-red-600 shadow-kitschy disabled:opacity-40"
                              >
                                밴
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
