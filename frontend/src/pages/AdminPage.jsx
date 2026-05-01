import { useEffect, useMemo, useRef, useState } from 'react'
import api, { getApiErrorMessage } from '../services/api'
import MarkdownRenderer from '../components/MarkdownRenderer'

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

const MARKDOWN_TOOLS = [
  { label: 'H2', before: '## ', after: '', fallback: '제목' },
  { label: 'B', before: '**', after: '**', fallback: '굵은 글씨' },
  { label: 'I', before: '*', after: '*', fallback: '기울임' },
  { label: '•', before: '- ', after: '', fallback: '목록 항목' },
  { label: '>', before: '> ', after: '', fallback: '인용문' },
  { label: '`', before: '`', after: '`', fallback: '코드' },
  { label: 'Link', before: '[', after: '](https://)', fallback: '링크 텍스트' },
]

function toLocalInputValue(value) {
  const date = value
    ? Array.isArray(value)
      ? new Date(value[0], (value[1] || 1) - 1, value[2] || 1, value[3] || 0, value[4] || 0)
      : new Date(value)
    : new Date()
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
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
  const [todayStats, setTodayStats] = useState(null)
  const [notices, setNotices] = useState([])
  const [loadingInquiries, setLoadingInquiries] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingNotices, setLoadingNotices] = useState(true)
  const [selected, setSelected] = useState(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [workingUserId, setWorkingUserId] = useState(null)
  const [managingUser, setManagingUser] = useState(null)
  const [banReasonInput, setBanReasonInput] = useState('')
  const [savingNotice, setSavingNotice] = useState(false)
  const [editingNoticeId, setEditingNoticeId] = useState(null)
  const [noticeForm, setNoticeForm] = useState({
    title: '',
    content: '',
    publishAt: toLocalInputValue(),
    status: 'PUBLISHED',
  })
  const noticeEditorRef = useRef(null)

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

  const fetchTodayStats = () => {
    api.get('/admin/stats/today')
      .then((res) => setTodayStats(res.data))
      .catch(() => setTodayStats(null))
  }

  const fetchNotices = () => {
    setLoadingNotices(true)
    api.get('/admin/notices')
      .then((res) => setNotices(Array.isArray(res.data) ? res.data : []))
      .catch(() => setNotices([]))
      .finally(() => setLoadingNotices(false))
  }

  useEffect(() => {
    fetchInquiries()
    fetchUsers()
    fetchTodayStats()
    fetchNotices()
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
    } catch (err) {
      alert(getApiErrorMessage(err, '답변 전송에 실패했어요.'))
    } finally {
      setSending(false)
    }
  }

  const openUserManage = (user) => {
    setManagingUser(user)
    setBanReasonInput(user.banReason || '')
  }

  const handleBan = async () => {
    if (!managingUser) return
    if (!window.confirm(`${managingUser.email} 사용자를 밴할까요?`)) return
    const user = managingUser
    setWorkingUserId(user.userId)
    try {
      await api.patch(`/admin/users/${user.userId}/ban`, { reason: banReasonInput.trim() })
      setManagingUser(null)
      fetchUsers()
    } catch (err) {
      alert(getApiErrorMessage(err, '밴 처리에 실패했어요.'))
    } finally {
      setWorkingUserId(null)
    }
  }

  const handleUnban = async () => {
    if (!managingUser) return
    if (!window.confirm(`${managingUser.email} 사용자의 밴을 해제할까요?`)) return
    const user = managingUser
    setWorkingUserId(user.userId)
    try {
      await api.patch(`/admin/users/${user.userId}/unban`)
      setManagingUser(null)
      fetchUsers()
    } catch (err) {
      alert(getApiErrorMessage(err, '밴 해제에 실패했어요.'))
    } finally {
      setWorkingUserId(null)
    }
  }

  const resetNoticeForm = () => {
    setEditingNoticeId(null)
    setNoticeForm({ title: '', content: '', publishAt: toLocalInputValue(), status: 'PUBLISHED' })
  }

  const editNotice = (notice) => {
    setEditingNoticeId(notice.noticeId)
    setNoticeForm({
      title: notice.title || '',
      content: notice.content || '',
      publishAt: toLocalInputValue(notice.publishAt),
      status: notice.status || 'PUBLISHED',
    })
  }

  const saveNotice = async () => {
    if (!noticeForm.title.trim() || !noticeForm.content.trim()) return
    setSavingNotice(true)
    const payload = {
      title: noticeForm.title.trim(),
      content: noticeForm.content.trim(),
      publishAt: noticeForm.publishAt ? new Date(noticeForm.publishAt).toISOString().slice(0, 19) : null,
      status: noticeForm.status,
    }
    try {
      if (editingNoticeId) await api.patch(`/admin/notices/${editingNoticeId}`, payload)
      else await api.post('/admin/notices', payload)
      resetNoticeForm()
      fetchNotices()
    } catch (err) {
      alert(getApiErrorMessage(err, '공지 저장에 실패했어요.'))
    } finally {
      setSavingNotice(false)
    }
  }

  const archiveNotice = async (notice) => {
    if (!window.confirm(`"${notice.title}" 공지를 보관할까요?`)) return
    try {
      await api.delete(`/admin/notices/${notice.noticeId}`)
      if (editingNoticeId === notice.noticeId) resetNoticeForm()
      fetchNotices()
    } catch (err) {
      alert(getApiErrorMessage(err, '공지 보관에 실패했어요.'))
    }
  }

  const insertMarkdown = ({ before, after, fallback }) => {
    const editor = noticeEditorRef.current
    const value = noticeForm.content
    const start = editor?.selectionStart ?? value.length
    const end = editor?.selectionEnd ?? value.length
    const selected = value.slice(start, end) || fallback
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`
    const cursor = start + before.length + selected.length + after.length
    setNoticeForm((prev) => ({ ...prev, content: next }))
    window.requestAnimationFrame(() => {
      noticeEditorRef.current?.focus()
      noticeEditorRef.current?.setSelectionRange(cursor, cursor)
    })
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
            ['notices', '공지'],
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatPill label="오늘 가입" value={todayStats?.joinedUsers ?? '-'} />
        <StatPill label="오늘 할 일" value={todayStats?.createdTasks ?? '-'} />
        <StatPill label="오늘 루틴" value={todayStats?.createdRoutines ?? '-'} />
        <StatPill label="브레인덤프" value={todayStats?.brainDumps ?? '-'} />
        <StatPill label="AI 호출 로그" value={todayStats?.aiUsageLogs ?? '-'} />
        <StatPill label="AI 사용량" value={todayStats?.aiUsed ?? '-'} />
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
                            <button
                              type="button"
                              onClick={() => openUserManage(user)}
                              disabled={disabled}
                              className="rounded-lg border-2 border-dark bg-white px-3 py-1.5 text-xs font-black text-dark shadow-kitschy disabled:opacity-40"
                            >
                              관리
                            </button>
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

      {tab === 'notices' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card-kitschy">
            <h3 className="mb-4 font-extrabold text-dark">
              {editingNoticeId ? '공지 수정' : '공지 작성'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-dark/60">제목</label>
                <input
                  value={noticeForm.title}
                  onChange={(e) => setNoticeForm((prev) => ({ ...prev, title: e.target.value }))}
                  maxLength={200}
                  className="w-full rounded-lg border-2 border-dark bg-white px-3 py-2 text-sm font-bold outline-none focus:border-primary"
                  placeholder="공지 제목"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-dark/60">내용</label>
                <div className="overflow-hidden rounded-lg border-2 border-dark bg-white">
                  <div className="flex flex-wrap gap-1 border-b-2 border-dark/10 bg-accent px-2 py-2">
                    {MARKDOWN_TOOLS.map((tool) => (
                      <button
                        key={tool.label}
                        type="button"
                        onClick={() => insertMarkdown(tool)}
                        className="rounded-md border-2 border-dark/20 bg-white px-2 py-1 text-[10px] font-black text-dark hover:border-dark"
                      >
                        {tool.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    ref={noticeEditorRef}
                    value={noticeForm.content}
                    onChange={(e) => setNoticeForm((prev) => ({ ...prev, content: e.target.value }))}
                    rows={10}
                    maxLength={5000}
                    className="w-full resize-none bg-white px-3 py-2 text-sm font-semibold outline-none"
                    placeholder="## 업데이트 안내&#10;- 새 기능&#10;- 수정 사항&#10;&#10;**중요한 내용**을 강조할 수 있어요."
                  />
                </div>
                <p className="mt-1 text-right text-[10px] font-bold text-dark/40">{noticeForm.content.length} / 5000</p>
              </div>
              <div>
                <p className="mb-1 block text-xs font-bold text-dark/60">미리보기</p>
                <div className="min-h-28 rounded-lg border-2 border-dark/10 bg-white p-3">
                  {noticeForm.content.trim() ? (
                    <MarkdownRenderer content={noticeForm.content} />
                  ) : (
                    <p className="text-xs font-bold text-dark/30">작성한 내용이 여기에 표시됩니다.</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-dark/60">게시 시간</label>
                  <input
                    type="datetime-local"
                    value={noticeForm.publishAt}
                    onChange={(e) => setNoticeForm((prev) => ({ ...prev, publishAt: e.target.value }))}
                    className="w-full rounded-lg border-2 border-dark bg-white px-3 py-2 text-sm font-bold outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-dark/60">상태</label>
                  <select
                    value={noticeForm.status}
                    onChange={(e) => setNoticeForm((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full rounded-lg border-2 border-dark bg-white px-3 py-2 text-sm font-bold outline-none focus:border-primary"
                  >
                    <option value="PUBLISHED">게시</option>
                    <option value="DRAFT">초안</option>
                    <option value="ARCHIVED">보관</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                {editingNoticeId && (
                  <button type="button" onClick={resetNoticeForm} className="btn-kitschy flex-1 bg-accent py-2 text-sm text-dark">
                    새 공지
                  </button>
                )}
                <button
                  type="button"
                  onClick={saveNotice}
                  disabled={savingNotice || !noticeForm.title.trim() || !noticeForm.content.trim()}
                  className="btn-kitschy flex-1 bg-primary py-2 text-sm text-white disabled:opacity-50"
                >
                  {savingNotice ? '저장 중...' : editingNoticeId ? '수정 저장' : '공지 저장'}
                </button>
              </div>
            </div>
          </div>

          <div className="card-kitschy">
            <h3 className="mb-4 font-extrabold text-dark">공지 목록</h3>
            {loadingNotices ? (
              <div className="py-12 text-center">
                <p className="font-bold text-dark/50">불러오는 중...</p>
              </div>
            ) : notices.length === 0 ? (
              <div className="py-12 text-center">
                <p className="font-bold text-dark/50">등록된 공지가 없어요.</p>
              </div>
            ) : (
              <div className="max-h-[680px] space-y-3 overflow-y-auto pr-1">
                {notices.map((notice) => (
                  <article key={notice.noticeId} className="rounded-lg border-2 border-dark/10 bg-white p-3">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-dark">{notice.title}</p>
                        <p className="mt-1 text-[10px] font-bold text-dark/40">
                          {notice.status} · {formatDate(notice.publishAt)}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => editNotice(notice)}
                          className="rounded-lg border-2 border-dark bg-accent px-2 py-1 text-[10px] font-black text-dark"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => archiveNotice(notice)}
                          className="rounded-lg border-2 border-red-500 bg-white px-2 py-1 text-[10px] font-black text-red-600"
                        >
                          보관
                        </button>
                      </div>
                    </div>
                    <p className="line-clamp-3 whitespace-pre-wrap text-xs font-semibold leading-relaxed text-dark/60">
                      {notice.content}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {managingUser && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-dark/40 px-4" onClick={() => setManagingUser(null)}>
          <div className="card-kitschy w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="heading-kitschy text-xl">회원 관리</h3>
                <p className="mt-2 truncate text-xs font-semibold text-dark/50">{managingUser.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setManagingUser(null)}
                className="h-8 w-8 rounded-lg border-2 border-dark text-sm font-black text-dark hover:bg-primary hover:text-white"
              >
                X
              </button>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border-2 border-dark/10 bg-white px-4 py-3">
                <p className="text-xs font-black text-dark/40">현재 상태</p>
                <p className="mt-1 text-sm font-black text-dark">
                  {managingUser.isAdmin ? '관리자' : USER_STATUS[managingUser.status]?.label || managingUser.status}
                </p>
              </div>

              {managingUser.status !== 'BANNED' && (
                <div>
                  <label className="mb-1 block text-xs font-bold text-dark/60">밴 사유</label>
                  <textarea
                    value={banReasonInput}
                    onChange={(e) => setBanReasonInput(e.target.value)}
                    rows={4}
                    maxLength={500}
                    placeholder="운영 메모로 남길 사유를 입력해주세요."
                    className="w-full resize-none rounded-lg border-2 border-dark bg-accent px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
                  />
                </div>
              )}

              {managingUser.status === 'BANNED' && managingUser.banReason && (
                <div className="rounded-lg border-2 border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-xs font-black text-red-600">밴 사유</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs font-semibold text-red-500/80">{managingUser.banReason}</p>
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setManagingUser(null)}
                disabled={workingUserId === managingUser.userId}
                className="btn-kitschy flex-1 bg-accent py-2 text-sm text-dark disabled:opacity-50"
              >
                닫기
              </button>
              {managingUser.status === 'BANNED' ? (
                <button
                  type="button"
                  onClick={handleUnban}
                  disabled={workingUserId === managingUser.userId}
                  className="btn-kitschy flex-1 bg-secondary py-2 text-sm text-white disabled:opacity-50"
                >
                  {workingUserId === managingUser.userId ? '처리 중...' : '밴 해제'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBan}
                  disabled={workingUserId === managingUser.userId || managingUser.isAdmin || managingUser.status === 'WITHDRAWN'}
                  className="btn-kitschy flex-1 bg-primary py-2 text-sm text-white disabled:opacity-50"
                >
                  {workingUserId === managingUser.userId ? '처리 중...' : '밴 적용'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
