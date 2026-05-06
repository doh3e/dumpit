import { Link } from 'react-router-dom'

const SECTIONS = [
  {
    title: '1. 수집하는 개인정보 항목',
    body: (
      <>
        <p className="mb-2">덤핏은 서비스 제공을 위해 다음 정보를 수집합니다.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>이메일 주소, 이름, 프로필 이미지 (Google 계정 인증 시 자동 수집)</li>
          <li>회원 식별자 (Google sub ID)</li>
          <li>이용자가 등록한 태스크 정보 (제목, 설명, 마감일, 카테고리, 우선순위 등)</li>
          <li>이용자가 작성한 브레인덤프 원문 텍스트</li>
          <li>이용자가 작성한 아이디어 및 루틴 정보</li>
          <li>활동 코인 잔액 및 변동 이력</li>
          <li>AI 기능 사용 이력 (사용 일시, 기능 유형, 차감 점수)</li>
          <li>서비스 내 활동 기록 (태스크·아이디어·루틴 생성·수정·삭제 이력 및 변경 전후 내용 일부)</li>
          <li>접속 로그, IP 주소, 쿠키, 서비스 이용 기록 (자동 수집)</li>
        </ul>
        <p className="mt-2 text-dark/70">
          Google Calendar 일정 정보는 일과표 표시를 위해 실시간 조회만 하며 별도로 저장하지 않습니다.
        </p>
      </>
    ),
  },
  {
    title: '2. 개인정보의 수집 및 이용 목적',
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>회원 식별 및 본인 인증</li>
        <li>태스크 관리 서비스 제공</li>
        <li>AI 기반 우선순위 분석 및 태스크 추출</li>
        <li>활동 코인 적립/사용 및 게임화 기능 제공</li>
        <li>고객 문의 응대 및 서비스 개선</li>
        <li>AI 사용량 한도 관리 및 분쟁 대응</li>
        <li>부정 이용 방지 및 보안 점검</li>
      </ul>
    ),
  },
  {
    title: '3. 개인정보의 보유 및 이용 기간',
    body: (
      <>
        <p className="mb-2">
          이용자의 개인정보는 회원 탈퇴 시 지체 없이 파기됩니다. 단, 관계 법령에 따라 보존이 필요한 경우 해당 법령에서 정한 기간 동안 보관하며, 서비스 운영상 필요한 로그는 회원 유지 기간 동안 보관할 수 있습니다. 회원 탈퇴 후에는 아래 기간 동안 보관 후 파기합니다.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>접속 로그: 통신비밀보호법에 따라 3개월</li>
          <li>AI 기능 사용 로그 (사용 일시·기능 유형·차감 점수): 180일</li>
          <li>서비스 활동 로그 (태스크 생성·수정·삭제 이력): 90일</li>
        </ul>
        <p className="mt-2 text-dark/70">
          AI 사용 로그 및 활동 로그는 문의 대응·분쟁 해결·부정 이용 방지 목적으로만 활용되며, 보존 기간 종료 후 즉시 파기됩니다.
        </p>
      </>
    ),
  },
  {
    title: '4. 개인정보의 제3자 제공',
    body: (
      <>
        <p className="mb-2">덤핏은 원활한 서비스 제공을 위해 다음 업체에 개인정보를 제공합니다.</p>
        <div className="space-y-2">
          <div className="p-3 bg-accent rounded-lg border border-dark/10">
            <p className="font-bold text-dark text-sm">OpenAI, L.L.C. (미국)</p>
            <p className="text-xs text-dark/70 mt-1">제공 항목: 태스크 제목/설명, 브레인덤프 원문 텍스트</p>
            <p className="text-xs text-dark/70">이용 목적: 우선순위 분석, 태스크 추출, 카테고리 분류</p>
            <p className="text-xs text-dark/70">보유 기간: OpenAI의 자체 정책에 따름 (현재 30일)</p>
          </div>
          <div className="p-3 bg-accent rounded-lg border border-dark/10">
            <p className="font-bold text-dark text-sm">Google LLC (미국)</p>
            <p className="text-xs text-dark/70 mt-1">제공 항목: 이메일, 이름, 프로필 이미지, 캘린더 조회 권한</p>
            <p className="text-xs text-dark/70">이용 목적: OAuth 인증, Google Calendar 조회</p>
            <p className="text-xs text-dark/70">보유 기간: Google의 자체 정책에 따름</p>
          </div>
          <div className="p-3 bg-accent rounded-lg border border-dark/10">
            <p className="font-bold text-dark text-sm">Sentry (미국, Functional Software, Inc.)</p>
            <p className="text-xs text-dark/70 mt-1">제공 항목: 오류 발생 시 접속 환경 정보 (브라우저, OS 등)</p>
            <p className="text-xs text-dark/70">이용 목적: 서비스 오류 모니터링 및 안정성 개선</p>
            <p className="text-xs text-dark/70">보유 기간: Sentry의 자체 정책에 따름 (최대 90일)</p>
          </div>
        </div>
      </>
    ),
  },
  {
    title: '5. Google 사용자 데이터의 이용, 공유 및 공개',
    body: (
      <>
        <p className="mb-2">
          덤핏은 Google OAuth 및 Google API를 통해 이용자가 명시적으로 승인한 범위 내에서만 Google 사용자 데이터에 접근합니다.
          덤핏이 접근하는 Google 사용자 데이터에는 Google 계정 인증 정보와 Google Calendar 일정 조회 권한 및 일정 정보가 포함될 수 있습니다.
        </p>
        <p className="mb-2">
          Google Calendar 일정 정보는 서비스 내 일과표 표시 및 이용자가 선택한 일정 기반 태스크 생성 기능을 제공하기 위해 사용되며,
          덤핏 서버에 별도로 저장하지 않습니다.
        </p>
        <p className="mb-2">
          덤핏은 Google 사용자 데이터를 판매하지 않으며, 광고, 리타게팅, 개인화 광고, 신용평가, 대출 심사 또는 이와 유사한 목적으로
          사용하거나 제3자에게 이전하지 않습니다.
        </p>
        <p className="mb-2">
          덤핏은 다음의 경우에 한해 Google 사용자 데이터를 공유, 이전 또는 공개할 수 있습니다.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>이용자가 요청한 서비스 기능을 제공하거나 개선하기 위해 필요한 경우</li>
          <li>서비스 보안, 오류 분석, 부정 이용 방지 및 안정적인 운영을 위해 필요한 경우</li>
          <li>법령, 수사기관 또는 규제기관의 적법한 요청에 따라 필요한 경우</li>
          <li>이용자의 명시적인 동의를 받은 경우</li>
        </ul>
        <p className="mt-2 text-dark/70">
          The use of raw or derived user data received from Workspace APIs will adhere to the Google User Data Policy, including the Limited Use requirements.
        </p>
      </>
    ),
  },
  {
    title: '6. 이용자의 권리',
    body: (
      <>
        <p className="mb-2">이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>개인정보 열람 요청</li>
          <li>개인정보 정정/삭제 요청</li>
          <li>개인정보 처리정지 요청</li>
          <li>회원 탈퇴 및 데이터 삭제 요청</li>
        </ul>
        <p className="mt-2 text-dark/70">
          위 권리 행사는 서비스 내 마이페이지를 통하거나, 아래 개인정보 보호책임자에게 이메일로 요청해주세요.
        </p>
      </>
    ),
  },
  {
    title: '7. 쿠키의 운영',
    body: (
      <p>
        덤핏은 로그인 세션 유지 및 서비스 이용 편의 제공을 위해 쿠키를 사용합니다. 이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 이 경우 일부 서비스 이용이 제한될 수 있습니다.
      </p>
    ),
  },
  {
    title: '8. 개인정보의 안전성 확보 조치',
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>HTTPS(TLS) 암호화 통신 적용</li>
        <li>접근 권한 관리 및 최소 인원 원칙</li>
        <li>개인정보 처리 시스템 접근 기록 보관</li>
        <li>주요 자격증명의 환경변수/시크릿 관리</li>
      </ul>
    ),
  },
  {
    title: '9. 개인정보 보호책임자',
    body: (
      <div className="p-3 bg-accent rounded-lg border border-dark/10">
        <p className="text-sm">
          <span className="font-bold">성명/부서</span>: 덤핏 운영팀
        </p>
        <p className="text-sm">
          <span className="font-bold">연락처</span>:{' '}
          <a href="mailto:dumpitadmin@gmail.com" className="text-primary underline">
            dumpitadmin@gmail.com
          </a>
        </p>
      </div>
    ),
  },
  {
    title: '10. 처리방침의 변경',
    body: (
      <p>
        본 개인정보 처리방침은 법령 또는 서비스 정책의 변경에 따라 수정될 수 있으며, 변경 시 서비스 내 공지를 통해 안내합니다.
      </p>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-accent">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link to="/" className="text-sm font-bold text-primary hover:underline">
            ← 홈으로
          </Link>
        </div>

        <div className="card-kitschy space-y-6">
          <div>
            <h1 className="heading-kitschy text-2xl">개인정보 처리방침</h1>
            <p className="text-xs text-dark/60 font-semibold mt-2">시행일자: 2026년 5월 6일</p>
          </div>

          <div className="space-y-6 text-sm text-dark">
            {SECTIONS.map((section) => (
              <section key={section.title}>
                <h2 className="font-extrabold text-dark mb-2">{section.title}</h2>
                <div className="text-dark/80 leading-relaxed">{section.body}</div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
