import { Link } from 'react-router-dom'

// Google Play는 앱 내 삭제 경로와 별개로, 앱을 이미 지운 이용자도 볼 수 있는 웹 삭제 요청 경로를 요구한다(Play Console 데이터 안전 섹션에 이 주소를 제출).
export default function AccountDeletionPage() {
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
            <h1 className="font-dungeon text-dark text-2xl">계정 및 데이터 삭제</h1>
            <p className="text-sm text-sub font-semibold mt-3">
              덤핏(Dumpit!) 계정과 계정에 저장된 데이터를 삭제하는 방법을 안내합니다.
              웹사이트와 안드로이드 앱 모두 동일하게 적용됩니다.
            </p>
          </div>

          <section>
            <h2 className="font-extrabold text-dark mb-2">1. 직접 삭제하기</h2>
            <div className="text-sub leading-relaxed text-sm space-y-2">
              <p><span className="font-bold text-dark">웹사이트</span>: 로그인 후 마이페이지 → 회원 탈퇴</p>
              <p><span className="font-bold text-dark">안드로이드 앱</span>: MY 탭 → 설정 → 회원 탈퇴</p>
            </div>
          </section>

          <section>
            <h2 className="font-extrabold text-dark mb-2">2. 앱을 이미 삭제한 경우</h2>
            <div className="text-sub leading-relaxed text-sm space-y-2">
              <p>
                앱을 지웠거나 서비스에 접속하기 어려운 경우, 가입에 사용한 Google 계정 이메일 주소로
                아래 주소에 삭제를 요청해 주세요. 본인 확인 후 처리해 드립니다.
              </p>
              <div className="p-3 bg-accent rounded-lg border border-line">
                <p className="text-sm">
                  <span className="font-bold">이메일</span>:{' '}
                  <a href="mailto:dumpitadmin@gmail.com" className="text-primary underline">
                    dumpitadmin@gmail.com
                  </a>
                </p>
                <p className="text-xs text-sub mt-1">제목에 “계정 삭제 요청”을 적어주시면 빠르게 확인할 수 있습니다.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-extrabold text-dark mb-2">3. 삭제되는 데이터와 시점</h2>
            <div className="text-sub leading-relaxed text-sm space-y-2">
              <p>
                탈퇴하면 <span className="font-bold text-dark">즉시</span> 서비스 이용이 중단되고, 등록한 할 일·아이디어·루틴·브레인덤프를
                더 이상 볼 수 없게 됩니다. 푸시 알림 발송을 위한 기기 정보도 이때 바로 삭제됩니다.
              </p>
              <p>
                착오로 탈퇴한 경우를 위하여 <span className="font-bold text-dark">30일</span> 동안 계정과 데이터를 복구 목적으로 보관합니다.
                이 기간에 같은 Google 계정으로 다시 로그인하면 탈퇴가 취소되고 기록이 그대로 복구됩니다.
              </p>
              <p>
                30일이 지나면 계정 정보(이메일, 이름, 프로필 이미지, Google 계정 식별자)와 할 일·아이디어·루틴·브레인덤프·코인 및
                구매 내역이 <span className="font-bold text-dark">복구할 수 없도록 완전히 삭제</span>됩니다. 해당 이용자의 활동 로그와
                AI 사용 로그도 함께 삭제됩니다.
              </p>
              <p>
                다만 문의 처리 기록은 분쟁 대응을 위하여 계정과의 연결을 끊은 뒤 처리 완료일부터 1년간 보관한 후 파기합니다.
                자세한 내용은{' '}
                <Link to="/privacy" className="text-primary underline">개인정보처리방침</Link>
                의 보유 및 이용 기간 항목을 참고해 주세요.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-extrabold text-dark mb-2">4. Google 계정 연결 해제</h2>
            <div className="text-sub leading-relaxed text-sm space-y-2">
              <p>
                탈퇴 시 서비스에 부여된 Google 권한은 자동으로 해제됩니다. 직접 확인하거나 해제하려면
                Google 계정의 보안 설정에서 “서드파티 앱 및 서비스” 항목을 확인하시면 됩니다.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
