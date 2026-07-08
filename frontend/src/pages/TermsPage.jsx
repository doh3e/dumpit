import { Link } from 'react-router-dom'

const SECTIONS = [
  {
    title: '제1조 (목적)',
    body: (
      <p>
        이 약관은 덤핏(Dumpit!, 이하 “서비스”)의 이용과 관련하여 서비스를 운영하는 자(이하 “운영자”)와
        이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
      </p>
    ),
  },
  {
    title: '제2조 (정의)',
    body: (
      <>
        <p className="mb-2">이 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>“서비스”란 태스크 관리, 브레인덤프, 아이디어 정리, 루틴 관리 등을 제공하는 생산성 웹 서비스인 덤핏(Dumpit!)을 말합니다.</li>
          <li>“이용자”란 이 약관에 동의하고 서비스를 이용하는 자를 말합니다.</li>
          <li>“브레인덤프”란 이용자가 자유롭게 입력한 텍스트에서 태스크를 추출하는 기능 및 그 입력 텍스트를 말합니다.</li>
          <li>“AI 기능”이란 태스크 추출, 우선순위 분석, 카테고리 분류 등 인공지능 모델을 이용하여 제공되는 기능을 말합니다.</li>
          <li>“코인”이란 서비스 내 활동에 따라 적립되는 서비스 전용 가상 재화를 말합니다.</li>
        </ol>
        <p className="mt-2 text-sub">
          이 약관에서 정의하지 않은 용어는 관련 법령 및 일반적인 상관례에 따릅니다.
        </p>
      </>
    ),
  },
  {
    title: '제3조 (약관의 게시와 개정)',
    body: (
      <ol className="list-decimal pl-5 space-y-1">
        <li>운영자는 이 약관의 내용을 이용자가 쉽게 확인할 수 있도록 서비스 내 화면에 게시합니다.</li>
        <li>운영자는 관련 법령을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.</li>
        <li>약관을 개정하는 경우 적용일자 및 개정 사유를 명시하여 적용일자 이전에 서비스 내 공지 또는 약관 페이지를 통하여 안내합니다.</li>
        <li>이용자가 개정 약관의 적용일 이후에도 서비스를 계속 이용하는 경우 개정 약관에 동의한 것으로 봅니다. 개정 약관에 동의하지 않는 이용자는 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
      </ol>
    ),
  },
  {
    title: '제4조 (이용계약의 체결)',
    body: (
      <ol className="list-decimal pl-5 space-y-1">
        <li>서비스 이용계약은 이용자가 이 약관에 동의하고 Google 계정을 통한 OAuth 인증을 완료함으로써 체결됩니다.</li>
        <li>만 14세 미만인 자는 서비스를 이용할 수 없습니다.</li>
        <li>운영자는 부정한 방법으로 가입을 시도하거나 과거에 이용 제한을 받은 이력이 있는 경우 등 정당한 사유가 있는 때에는 이용 신청을 승낙하지 않거나 사후에 이용계약을 해지할 수 있습니다.</li>
      </ol>
    ),
  },
  {
    title: '제5조 (이용자의 의무)',
    body: (
      <>
        <p className="mb-2">이용자는 다음 각 호의 행위를 하여서는 안 됩니다.</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>자동화된 수단(봇, 스크래퍼 등)을 이용하여 서비스에 접근하는 행위</li>
          <li>타인의 계정을 도용하거나 타인을 사칭하는 행위</li>
          <li>서비스의 서버 또는 네트워크에 과부하를 유발하는 행위</li>
          <li>불법적이거나 타인의 권리를 침해하는 콘텐츠를 등록하는 행위</li>
          <li>AI 기능을 악용하거나 이용 한도 등을 우회하는 행위</li>
          <li>기타 관계 법령 또는 이 약관을 위반하는 행위</li>
        </ol>
        <p className="mt-2 text-sub">
          이용자가 위 각 호의 행위를 한 경우 운영자는 서비스 이용을 제한하거나 이용계약을 해지할 수 있습니다.
        </p>
      </>
    ),
  },
  {
    title: '제6조 (AI 기능의 이용)',
    body: (
      <ol className="list-decimal pl-5 space-y-1">
        <li>AI 기능은 OpenAI, L.L.C.의 API를 통하여 제공되며, AI 분석에 필요한 정보의 처리 범위는 개인정보처리방침에서 정하는 바에 따릅니다.</li>
        <li>운영자는 AI가 생성한 결과물(태스크 추출, 우선순위 분석 등)의 정확성, 완전성 및 적합성을 보장하지 않으며, 이용자는 AI 분석 결과를 참고 자료로만 활용하여야 합니다.</li>
        <li>AI 기능에는 일일 사용량 한도(100점)가 적용되며, 한도를 초과하는 경우 당일 AI 기능의 이용이 제한됩니다.</li>
        <li>사용량 한도는 매일 자정(KST)에 초기화됩니다.</li>
        <li>AI 기능의 이용 시 요청 원문 및 응답 결과는 사용 로그에 저장되지 않으며, 사용 일시·기능 유형·차감 점수 등 이용 기록의 수집 범위는 개인정보처리방침에서 정하는 바에 따릅니다.</li>
      </ol>
    ),
  },
  {
    title: '제7조 (코인)',
    body: (
      <ol className="list-decimal pl-5 space-y-1">
        <li>코인은 태스크 완료, 포모도로 집중 등 서비스 내 활동을 통하여 적립됩니다.</li>
        <li>코인은 서비스 내에서만 사용할 수 있는 가상의 재화로서, 현금 또는 다른 재화로 교환·환급되지 않습니다.</li>
        <li>이용계약이 해지(회원 탈퇴)되는 경우 보유 코인은 소멸되며, 복구되지 않습니다.</li>
        <li>운영자는 서비스 정책 변경에 따라 코인의 적립·사용 방식을 변경할 수 있으며, 이 경우 사전에 서비스 내 공지를 통하여 안내합니다.</li>
      </ol>
    ),
  },
  {
    title: '제8조 (서비스의 변경 및 중단)',
    body: (
      <ol className="list-decimal pl-5 space-y-1">
        <li>서비스는 현재 베타 서비스로 운영되고 있으며, 서비스의 일부 기능 및 정책은 변경될 수 있습니다.</li>
        <li>운영자는 베타 서비스 기간 중 운영상·기술상의 필요에 따라 사전 예고 없이 서비스의 일부 또는 전부를 변경하거나 중단할 수 있습니다.</li>
        <li>베타 서비스의 특성상 데이터 유실, 기능 변경, 서비스 종료가 발생할 수 있으므로, 이용자는 중요한 데이터를 별도로 보관하여야 합니다.</li>
      </ol>
    ),
  },
  {
    title: '제9조 (이용계약의 해지 및 데이터의 삭제)',
    body: (
      <ol className="list-decimal pl-5 space-y-1">
        <li>이용자는 서비스 내 마이페이지를 통하여 언제든지 이용계약을 해지(회원 탈퇴)할 수 있습니다.</li>
        <li>이용계약이 해지되는 경우 이용자가 등록한 태스크, 아이디어, 루틴 등 서비스 이용 데이터는 지체 없이 삭제됩니다.</li>
        <li>다만, 관계 법령의 준수 또는 서비스 운영상 일정 기간 보존이 필요한 로그는 개인정보처리방침에서 정하는 기간 동안 보관된 후 파기됩니다.</li>
      </ol>
    ),
  },
  {
    title: '제10조 (권리의 귀속 및 데이터의 활용)',
    body: (
      <ol className="list-decimal pl-5 space-y-1">
        <li>서비스의 UI, 로고, 기능 등 서비스에 관한 지식재산권은 운영자에게 귀속됩니다.</li>
        <li>이용자가 서비스에 등록한 콘텐츠(태스크, 아이디어, 브레인덤프 등)에 대한 권리는 이용자 본인에게 귀속됩니다.</li>
        <li>운영자는 서비스 품질 개선 및 AI 기능 고도화를 위하여 이용자의 서비스 이용 기록 및 입력 데이터를 통계 분석 또는 모델 학습에 활용할 수 있습니다.</li>
        <li>전항에 따라 활용되는 데이터는 서비스 개선 목적으로만 이용되며, 외부에 판매, 제공 또는 공개되지 않습니다. 활용 시 가능한 범위에서 개인을 식별할 수 없도록 비식별 조치를 적용합니다.</li>
      </ol>
    ),
  },
  {
    title: '제11조 (면책)',
    body: (
      <ol className="list-decimal pl-5 space-y-1">
        <li>운영자는 천재지변, 서버 장애, 제3자가 제공하는 서비스(Google, OpenAI 등)의 오류 등 운영자의 합리적인 통제 범위를 벗어난 사유로 인하여 발생한 손해에 대하여 책임을 지지 않습니다.</li>
        <li>운영자는 AI 분석 결과의 오류로 인하여 발생한 손해에 대하여 책임을 지지 않습니다.</li>
        <li>운영자는 이용자 상호 간 또는 이용자와 제3자 간에 발생한 분쟁에 대하여 개입하거나 책임을 지지 않습니다.</li>
        <li>운영자는 베타 서비스 기간 중 발생한 데이터 유실에 대하여 책임을 지지 않습니다.</li>
      </ol>
    ),
  },
  {
    title: '제12조 (준거법 및 재판관할)',
    body: (
      <p>
        이 약관은 대한민국 법률에 따라 해석되며, 서비스 이용과 관련하여 발생한 분쟁에 대하여는
        대한민국 법원을 관할 법원으로 합니다.
      </p>
    ),
  },
  {
    title: '제13조 (문의)',
    body: (
      <div className="p-3 bg-accent rounded-lg border border-line">
        <p className="text-sm">
          이 약관에 관한 문의는 아래 연락처로 하실 수 있습니다.
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
  {
    title: '부칙',
    body: (
      <div className="space-y-1">
        <p>이 약관은 2026년 7월 15일부터 시행됩니다.</p>
        <p>종전의 약관은 2026년 4월 30일부터 2026년 7월 14일까지 적용됩니다.</p>
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

        <div className="card-retro space-y-6">
          <div>
            <h1 className="font-dungeon text-dark text-2xl">서비스 이용약관</h1>
            <p className="text-xs text-sub font-semibold mt-2">시행일자: 2026년 7월 15일</p>
          </div>

          <div className="space-y-6 text-sm text-dark">
            {SECTIONS.map((section) => (
              <section key={section.title}>
                <h2 className="font-extrabold text-dark mb-2">{section.title}</h2>
                <div className="text-sub leading-relaxed">{section.body}</div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
