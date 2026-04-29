import { Link } from 'react-router-dom'

const SECTIONS = [
  {
    title: '1. 서비스 소개',
    body: (
      <p>
        덤핏(Dumpit)은 태스크 관리, 브레인덤프, 아이디어 정리, 루틴 관리 등을 제공하는 생산성 웹 서비스입니다.
        현재 베타 서비스 중이며, 서비스의 일부 기능 및 정책은 변경될 수 있습니다.
      </p>
    ),
  },
  {
    title: '2. 이용 자격',
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>만 14세 이상이어야 서비스를 이용할 수 있습니다.</li>
        <li>Google 계정을 통한 OAuth 인증이 필요합니다.</li>
        <li>본 약관에 동의한 경우에 한해 서비스를 이용할 수 있습니다.</li>
      </ul>
    ),
  },
  {
    title: '3. 금지 행위',
    body: (
      <>
        <p className="mb-2">이용자는 다음 행위를 해서는 안 됩니다.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>자동화된 수단(봇, 스크래퍼 등)을 이용한 서비스 접근</li>
          <li>타인의 계정 도용 또는 사칭</li>
          <li>서비스 서버 또는 네트워크에 과부하를 주는 행위</li>
          <li>불법적이거나 타인의 권리를 침해하는 콘텐츠 등록</li>
          <li>AI 기능을 악용하거나 우회하는 행위</li>
          <li>기타 관계 법령을 위반하는 행위</li>
        </ul>
      </>
    ),
  },
  {
    title: '4. AI 기능 이용',
    body: (
      <>
        <ul className="list-disc pl-5 space-y-1">
          <li>AI 기능은 OpenAI의 API를 통해 제공됩니다.</li>
          <li>AI가 생성한 결과물(태스크 추출, 우선순위 분석 등)의 정확성을 보장하지 않습니다.</li>
          <li>AI 기능에는 일일 사용량 한도(100점)가 있으며, 한도 초과 시 당일 AI 기능 이용이 제한됩니다.</li>
          <li>사용량 한도는 매일 자정(KST)에 초기화됩니다.</li>
        </ul>
      </>
    ),
  },
  {
    title: '5. 코인',
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>코인은 서비스 내 활동(태스크 완료, 포모도로 집중 등)을 통해 적립됩니다.</li>
        <li>코인은 현금 또는 다른 재화로 교환할 수 없습니다.</li>
        <li>회원 탈퇴 시 보유 코인은 소멸됩니다.</li>
        <li>서비스 정책 변경에 따라 코인 적립·사용 방식이 변경될 수 있습니다.</li>
      </ul>
    ),
  },
  {
    title: '6. 서비스 변경 및 중단',
    body: (
      <>
        <p className="mb-2">
          운영자는 베타 서비스 기간 중 사전 예고 없이 서비스의 일부 또는 전부를 변경하거나 중단할 수 있습니다.
        </p>
        <p className="text-dark/70">
          베타 서비스 특성상 데이터 유실, 기능 변경, 서비스 종료가 발생할 수 있으므로 중요한 데이터는 별도로 보관하시기 바랍니다.
        </p>
      </>
    ),
  },
  {
    title: '7. 계정 해지 및 데이터 삭제',
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>이용자는 마이페이지를 통해 언제든지 탈퇴할 수 있습니다.</li>
        <li>탈퇴 시 이용자가 등록한 태스크, 아이디어, 루틴 등 모든 데이터가 즉시 삭제됩니다.</li>
        <li>단, 관계 법령에 따라 일정 기간 보존이 필요한 로그는 개인정보 처리방침에 따라 보관 후 삭제됩니다.</li>
      </ul>
    ),
  },
  {
    title: '8. 지적재산권',
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>덤핏 서비스(UI, 로고, 기능 등)에 관한 지적재산권은 운영자에게 있습니다.</li>
        <li>이용자가 서비스에 등록한 콘텐츠(태스크, 아이디어 등)의 권리는 이용자 본인에게 있습니다.</li>
        <li>운영자는 서비스 개선 목적으로 이용자 데이터를 익명·집계 형태로 활용할 수 있습니다.</li>
      </ul>
    ),
  },
  {
    title: '9. 면책 조항',
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>운영자는 천재지변, 서버 장애, 제3자 서비스(Google, OpenAI 등) 오류로 인한 손해에 대해 책임을 지지 않습니다.</li>
        <li>AI 분석 결과의 오류로 인한 손해에 대해 책임을 지지 않습니다.</li>
        <li>이용자 간 또는 이용자와 제3자 간의 분쟁에 대해 개입하거나 책임을 지지 않습니다.</li>
        <li>베타 서비스 중 발생한 데이터 유실에 대해 책임을 지지 않습니다.</li>
      </ul>
    ),
  },
  {
    title: '10. 준거법 및 관할',
    body: (
      <p>
        본 약관은 대한민국 법률에 따라 해석되며, 서비스 이용으로 발생한 분쟁은 대한민국 법원을 관할 법원으로 합니다.
      </p>
    ),
  },
  {
    title: '11. 문의',
    body: (
      <div className="p-3 bg-accent rounded-lg border border-dark/10">
        <p className="text-sm">
          약관 관련 문의는 아래로 연락해 주세요.
        </p>
        <p className="text-sm mt-1">
          <span className="font-bold">이메일</span>:{' '}
          <a href="mailto:dumpitadmin@gmail.com" className="text-primary underline">
            dumpitadmin@gmail.com
          </a>
        </p>
      </div>
    ),
  },
]

export default function TermsPage() {
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
            <h1 className="heading-kitschy text-2xl">서비스 이용약관</h1>
            <p className="text-xs text-dark/60 font-semibold mt-2">시행일자: 2026년 4월 30일</p>
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
