const SectionTitle = ({ children }) => (
  <h2 className="font-extrabold text-dark mb-2">{children}</h2>
)

const BulletList = ({ items }) => (
  <ul className="list-disc pl-5 space-y-1">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
)

const NumberedList = ({ items }) => (
  <ol className="list-decimal pl-5 space-y-1">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ol>
)

const DetailBlock = ({ title, rows }) => (
  <div className="p-3 bg-accent rounded-lg border border-dark/10">
    <p className="font-bold text-dark text-sm">{title}</p>
    <div className="mt-1 space-y-0.5">
      {rows.map((row) => (
        <p key={row} className="text-xs text-dark/70">{row}</p>
      ))}
    </div>
  </div>
)

export const PRIVACY_POLICY_EFFECTIVE_DATE = '2026년 5월 7일'

export default function PrivacyPolicyContent() {
  return (
    <div className="space-y-6 text-sm text-dark">
      <section>
        <SectionTitle>1. 개인정보의 처리 목적</SectionTitle>
        <div className="text-dark/80 leading-relaxed space-y-3">
          <p>덤핏은 다음 목적을 위해 개인정보를 처리합니다.</p>
          <div>
            <p className="font-bold text-dark">1. 회원 가입 및 로그인</p>
            <BulletList items={[
              'Google OAuth를 통한 회원 식별 및 본인 인증',
              '회원 계정 생성 및 관리',
              '부정 가입 및 비정상 이용 방지',
            ]} />
          </div>
          <div>
            <p className="font-bold text-dark">2. 서비스 제공</p>
            <BulletList items={[
              '태스크, 아이디어, 루틴 관리 기능 제공',
              '브레인덤프 텍스트 기반 태스크 추출 기능 제공',
              'AI 기반 우선순위 분석 및 카테고리 분류 기능 제공',
              'Google Calendar 일정 조회 및 일과표 표시 기능 제공',
              'Google Calendar 일정을 덤핏 태스크로 변환하는 기능 제공',
              '활동 코인 적립, 차감, 이력 관리 등 게임화 기능 제공',
            ]} />
          </div>
          <div>
            <p className="font-bold text-dark">3. 서비스 운영 및 개선</p>
            <BulletList items={[
              '서비스 이용 내역 확인',
              '오류 분석 및 안정성 개선',
              '고객 문의 응대',
              '이용자 요청 처리',
              '서비스 품질 개선',
            ]} />
          </div>
          <div>
            <p className="font-bold text-dark">4. 보안 및 분쟁 대응</p>
            <BulletList items={[
              '비정상 접근 탐지',
              '부정 이용 방지',
              '서비스 악용 방지',
              '분쟁 대응 및 기록 보존',
            ]} />
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>2. 처리하는 개인정보 항목</SectionTitle>
        <div className="text-dark/80 leading-relaxed space-y-3">
          <p>덤핏은 서비스 제공을 위해 다음 개인정보를 처리합니다.</p>
          <div>
            <p className="font-bold text-dark">1. Google OAuth 로그인 시 수집하는 정보</p>
            <BulletList items={['이메일 주소', '이름', '프로필 이미지', 'Google 계정 식별자(sub ID)']} />
          </div>
          <div>
            <p className="font-bold text-dark">2. 이용자가 직접 입력하거나 생성하는 정보</p>
            <BulletList items={[
              '태스크 정보: 제목, 설명, 마감일, 예상 소요 시간, 카테고리, 우선순위, 완료 여부 등',
              '브레인덤프 원문 텍스트',
              '아이디어 정보',
              '루틴 정보',
              '활동 코인 잔액 및 변동 이력',
            ]} />
          </div>
          <div>
            <p className="font-bold text-dark">3. Google Calendar 연동 시 처리하는 정보</p>
            <BulletList items={[
              '이용자가 동의한 범위 내의 Google Calendar 일정 조회 권한',
              '일정명, 일정 시간 등 Google Calendar 일정 정보',
            ]} />
            <p className="mt-2 text-dark/70">단, Google Calendar 원본 일정 데이터는 일과표 표시를 위해 조회하며, 덤핏 서버에 원본 형태로 저장하지 않습니다.</p>
            <p className="mt-2 text-dark/70">이용자가 Google Calendar 일정을 선택하여 덤핏 태스크로 변환하는 경우, 선택한 일정명, 시간 등은 덤핏의 태스크 데이터로 저장될 수 있습니다.</p>
          </div>
          <div>
            <p className="font-bold text-dark">4. AI 기능 이용 시 처리하는 정보</p>
            <BulletList items={[
              'AI 기능 사용 일시',
              '사용 기능 유형',
              '차감 점수 또는 사용량 정보',
              'AI 분석 요청에 포함된 브레인덤프 원문, 태스크 제목, 설명, 마감일 등',
            ]} />
          </div>
          <div>
            <p className="font-bold text-dark">5. 자동으로 생성 또는 수집되는 정보</p>
            <BulletList items={[
              '접속 로그',
              'IP 주소',
              '쿠키',
              '브라우저 정보',
              '운영체제 정보',
              '서비스 이용 기록',
              '오류 로그',
              '태스크, 아이디어, 루틴 생성·수정·삭제 이력',
            ]} />
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>3. Google 사용자 데이터의 처리</SectionTitle>
        <div className="text-dark/80 leading-relaxed space-y-3">
          <p>덤핏은 Google OAuth 및 Google API를 통해 이용자가 명시적으로 승인한 범위 내에서만 Google 사용자 데이터에 접근합니다.</p>
          <p>덤핏이 접근할 수 있는 Google 사용자 데이터에는 Google 계정 인증 정보와 Google Calendar 일정 조회 권한 및 일정 정보가 포함될 수 있습니다.</p>
          <DetailBlock title="1. Google 계정 인증 정보" rows={[
            '이용 목적: 회원 로그인, 회원 식별, 계정 관리',
            '처리 항목: 이메일 주소, 이름, 프로필 이미지, Google 계정 식별자',
            '보유 기간: 회원 탈퇴 시까지',
          ]} />
          <DetailBlock title="2. Google Calendar 일정 정보" rows={[
            '이용 목적: 일과표 표시, 일정 기반 태스크 생성',
            '처리 항목: 일정명, 일정 시간 등 이용자가 동의한 범위 내의 일정 정보',
            '저장 여부: Google Calendar 원본 일정 데이터는 덤핏 서버에 저장하지 않음',
          ]} />
          <p>Google Calendar 일정 정보는 기본적으로 서비스 화면 내 일과표 표시를 위해 조회됩니다.</p>
          <p>이용자가 특정 Google Calendar 일정을 선택하여 덤핏 태스크로 변환하는 경우, 해당 일정에서 선택된 일정명, 시간 등은 덤핏의 태스크 데이터로 저장될 수 있습니다.</p>
          <p>태스크 변환 데이터는 덤핏 서비스 내에서만 사용됩니다.</p>
          <p>이후 덤핏에서 일정명, 설명, 우선순위, 카테고리, 완료 여부 등이 변경되더라도 이용자의 Google Calendar 원본 일정에는 영향을 주지 않습니다.</p>
          <p>덤핏은 Google Calendar 원본 일정을 임의로 수정, 삭제, 생성하지 않습니다.</p>
          <p>덤핏은 Google 사용자 데이터를 판매하지 않습니다.</p>
          <p>덤핏은 Google 사용자 데이터를 광고, 리타게팅, 개인화 광고, 신용평가, 대출 심사 또는 이와 유사한 목적으로 사용하지 않습니다.</p>
          <p>덤핏은 Google 사용자 데이터를 원칙적으로 제3자와 공유, 이전 또는 공개하지 않습니다.</p>
          <p>다만 Google OAuth 로그인 및 Google Calendar API 연동을 제공하기 위해 Google LLC와 Google 사용자 데이터가 처리될 수 있습니다.</p>
          <p>이용자가 Google Calendar 기반으로 생성한 태스크에 대해 AI 분석 기능을 사용하는 경우, 해당 태스크에 포함된 일정명 및 시간 등 필요한 최소 정보가 OpenAI, L.L.C.에 전송될 수 있습니다.</p>
          <p>서비스 보안 유지, 오류 분석, 부정 이용 방지, 법령상 의무 이행 또는 수사기관·법원·규제기관의 적법한 요청이 있는 경우 필요한 범위 내에서 Google 사용자 데이터를 공유, 이전 또는 공개할 수 있습니다.</p>
          <p>덤핏은 이용자가 요청한 서비스 기능 제공, 보안 유지, 오류 분석, 법령상 의무 이행에 필요한 범위를 넘어 Google 사용자 데이터를 제3자에게 공유, 이전 또는 공개하지 않습니다.</p>
          <p className="text-dark/70">The use of raw or derived user data received from Workspace APIs will adhere to the Google User Data Policy, including the Limited Use requirements.</p>
        </div>
      </section>

      <section>
        <SectionTitle>4. 개인정보의 보유 및 이용 기간</SectionTitle>
        <div className="text-dark/80 leading-relaxed space-y-3">
          <p>덤핏은 개인정보 처리 목적 달성 시 또는 회원 탈퇴 시 개인정보를 지체 없이 파기합니다.</p>
          <p>단, 법령 준수, 부정 이용 방지, 분쟁 대응, 서비스 안정성 확보를 위해 필요한 일부 로그는 아래 기간 동안 보관한 후 파기합니다.</p>
          <div className="space-y-2">
            <DetailBlock title="1. 회원 계정 정보" rows={['보유 항목: 이메일 주소, 이름, 프로필 이미지, Google 계정 식별자', '보유 기간: 회원 탈퇴 시까지', '파기 시점: 회원 탈퇴 시 지체 없이 파기']} />
            <DetailBlock title="2. 서비스 이용 데이터" rows={['보유 항목: 태스크, 아이디어, 루틴, 브레인덤프 원문, 코인 정보', '보유 기간: 회원 탈퇴 시까지', '파기 시점: 회원 탈퇴 시 지체 없이 파기']} />
            <DetailBlock title="3. Google Calendar 원본 일정 데이터" rows={['보유 항목: 원본 일정명, 일정 시간 등', '보유 여부: 덤핏 서버에 저장하지 않음', '처리 방식: 이용자 요청 시 조회 후 별도 보관하지 않음']} />
            <DetailBlock title="4. Google Calendar 기반 태스크 변환 데이터" rows={['보유 항목: 이용자가 태스크로 변환한 일정명, 시간 등', '보유 기간: 회원 탈퇴 시까지', '파기 시점: 회원 탈퇴 시 지체 없이 파기']} />
            <DetailBlock title="5. 접속 로그" rows={['보유 항목: 접속 일시, IP 주소, 서비스 이용 기록 등', '보유 기간: 3개월', '보유 사유: 통신비밀보호법 등 관련 법령 준수 및 보안 점검']} />
            <DetailBlock title="6. AI 기능 사용 로그" rows={['보유 항목: 사용 일시, 기능 유형, 차감 점수, 요청 성공 여부', '보유 기간: 180일', '보유 사유: 사용량 한도 관리, 문의 대응, 부정 이용 방지, 분쟁 대응']} />
            <DetailBlock title="7. 서비스 활동 로그" rows={['보유 항목: 태스크, 아이디어, 루틴 생성·수정·삭제 이력', '보유 기간: 90일', '보유 사유: 오류 복구, 문의 대응, 부정 이용 방지']} />
            <DetailBlock title="8. 오류 로그" rows={['보유 항목: 오류 발생 시각, 브라우저, 운영체제, 접속 환경, 오류 메시지 등', '보유 기간: 최대 90일', '보유 사유: 서비스 오류 분석 및 안정성 개선']} />
            <DetailBlock title="9. 문의 처리 기록" rows={['보유 항목: 문의 내용, 이메일 주소, 처리 내역', '보유 기간: 문의 처리 완료 후 1년', '보유 사유: 동일 문의 대응 및 분쟁 방지']} />
          </div>
          <p>회원 탈퇴 후 보관되는 로그에는 서비스 운영상 필요한 최소 정보만 포함됩니다.</p>
          <p>회원 탈퇴 후 보관되는 로그는 원칙적으로 탈퇴한 이용자의 서비스 이용 내용을 복원하거나 재식별하기 위한 목적으로 사용하지 않습니다.</p>
        </div>
      </section>

      <section>
        <SectionTitle>5. 개인정보의 파기 절차 및 방법</SectionTitle>
        <div className="text-dark/80 leading-relaxed space-y-3">
          <p>덤핏은 보유기간 경과, 처리 목적 달성, 회원 탈퇴 등 파기 사유가 발생한 개인정보를 지체 없이 파기합니다.</p>
          <div>
            <p className="font-bold text-dark">1. 파기 절차</p>
            <BulletList items={['파기 사유가 발생한 개인정보를 확인합니다.', '법령 또는 내부 기준에 따라 보관이 필요한 로그를 분리합니다.', '보관 필요성이 없는 개인정보는 지체 없이 파기합니다.', '분리 보관된 로그는 정해진 보유기간 종료 후 파기합니다.']} />
          </div>
          <div>
            <p className="font-bold text-dark">2. 파기 방법</p>
            <BulletList items={['전자적 파일 형태의 개인정보는 복구 또는 재생되지 않도록 안전한 방법으로 삭제합니다.', '데이터베이스에 저장된 개인정보는 복구가 어렵도록 삭제 또는 비식별 처리합니다.', '종이 문서가 발생하는 경우 분쇄 또는 소각 방식으로 파기합니다.']} />
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>6. 개인정보의 제3자 제공</SectionTitle>
        <div className="text-dark/80 leading-relaxed space-y-3">
          <p>덤핏은 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다.</p>
          <p>다만, 다음 경우에는 개인정보를 제공할 수 있습니다.</p>
          <NumberedList items={['이용자가 사전에 명시적으로 동의한 경우', '법령에 특별한 규정이 있는 경우', '수사기관, 법원, 규제기관 등이 적법한 절차에 따라 요청한 경우', '이용자 또는 제3자의 생명, 신체, 재산상 이익을 보호하기 위해 필요한 경우']} />
          <p>덤핏은 Google 사용자 데이터를 판매하지 않으며, 광고, 리타게팅, 개인화 광고, 신용평가, 대출 심사 또는 이와 유사한 목적으로 제3자에게 제공하지 않습니다.</p>
        </div>
      </section>

      <section>
        <SectionTitle>7. 개인정보 처리업무의 위탁</SectionTitle>
        <div className="text-dark/80 leading-relaxed space-y-3">
          <p>덤핏은 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리업무를 외부 서비스에 위탁할 수 있습니다.</p>
          <div className="space-y-2">
            <DetailBlock title="1. OpenAI, L.L.C." rows={['국가: 미국', '위탁 업무: AI 기반 태스크 추출, 우선순위 분석, 카테고리 분류', '처리 항목: 브레인덤프 원문, 태스크 제목, 설명, 마감일, 카테고리 등 AI 분석에 필요한 정보', '보유 및 이용 기간: 위탁 목적 달성 시까지. 단, OpenAI의 부정사용 모니터링 정책에 따라 일부 데이터가 최대 30일간 보관될 수 있음']} />
            <DetailBlock title="2. Functional Software, Inc. 또는 Sentry 서비스 제공 주체" rows={['국가: 미국', '위탁 업무: 오류 모니터링, 서비스 안정성 분석', '처리 항목: 오류 발생 시각, 브라우저, 운영체제, 접속 환경, 오류 메시지 등', '보유 및 이용 기간: 최대 90일 또는 이용 중인 Sentry 요금제의 보존기간에 따름']} />
            <DetailBlock title="3. Cloudflare, Inc." rows={['국가: 미국', '위탁 업무: 웹 서비스 제공, CDN, 보안, 트래픽 처리', '처리 항목: IP 주소, 접속 로그, 브라우저 정보, 요청 URL 등', '보유 및 이용 기간: 위탁 목적 달성 시까지 또는 Cloudflare 정책에 따른 기간']} />
            <DetailBlock title="4. Google LLC" rows={['국가: 미국', '위탁 또는 연동 업무: Google OAuth 인증, Google Calendar API 제공', '처리 항목: Google 계정 인증 정보, 이용자가 승인한 Google Calendar 일정 정보', '보유 및 이용 기간: Google 계정 및 Google API 정책에 따름']} />
          </div>
          <p>덤핏은 위탁업무의 내용이나 수탁자가 변경되는 경우 본 개인정보처리방침을 통해 공개합니다.</p>
        </div>
      </section>

      <section>
        <SectionTitle>8. 개인정보의 국외 이전</SectionTitle>
        <div className="text-dark/80 leading-relaxed space-y-3">
          <p>덤핏은 서비스 제공을 위해 국외 사업자가 제공하는 클라우드 및 API 서비스를 사용할 수 있습니다.</p>
          <p>이에 따라 개인정보가 아래와 같이 국외로 이전될 수 있습니다.</p>
          <div className="space-y-2">
            <DetailBlock title="1. OpenAI, L.L.C." rows={['이전 국가: 미국', '이전 일시 및 방법: AI 기능 이용 시 암호화된 통신을 통한 API 전송', '이전 항목: 브레인덤프 원문, 태스크 제목, 설명, 마감일 등 AI 분석에 필요한 정보', '이용 목적: 태스크 추출, 우선순위 분석, 카테고리 분류', '보유 기간: 위탁 목적 달성 시까지. 단, OpenAI의 부정사용 모니터링 정책에 따라 최대 30일간 보관될 수 있음']} />
            <DetailBlock title="2. Functional Software, Inc. 또는 Sentry 서비스 제공 주체" rows={['이전 국가: 미국', '이전 일시 및 방법: 오류 발생 시 암호화된 통신을 통한 전송', '이전 항목: 오류 로그, 브라우저 정보, 운영체제 정보, 접속 환경 정보 등', '이용 목적: 오류 분석 및 서비스 안정성 개선', '보유 기간: 최대 90일 또는 이용 중인 Sentry 요금제의 보존기간에 따름']} />
            <DetailBlock title="3. Cloudflare, Inc." rows={['이전 국가: 미국 등 Cloudflare가 운영하는 인프라 소재 국가', '이전 일시 및 방법: 서비스 접속 시 암호화된 통신을 통한 전송', '이전 항목: IP 주소, 접속 로그, 요청 정보, 브라우저 정보 등', '이용 목적: 웹 서비스 제공, 보안, CDN, 트래픽 처리', '보유 기간: 위탁 목적 달성 시까지 또는 Cloudflare 정책에 따른 기간']} />
            <DetailBlock title="4. Google LLC" rows={['이전 국가: 미국 등 Google이 운영하는 인프라 소재 국가', '이전 일시 및 방법: Google OAuth 로그인 또는 Google Calendar API 이용 시 암호화된 통신을 통한 전송', '이전 항목: Google 계정 인증 정보, 이용자가 승인한 Google Calendar 일정 정보', '이용 목적: 로그인 인증, Google Calendar 일정 조회', '보유 기간: Google 계정 및 Google API 정책에 따름']} />
          </div>
          <p>이용자는 국외 이전을 거부할 수 있습니다.</p>
          <p>다만, 국외 이전을 거부하는 경우 Google OAuth 로그인, Google Calendar 연동, AI 분석, 오류 모니터링 등 일부 또는 전체 서비스 이용이 제한될 수 있습니다.</p>
        </div>
      </section>

      <section>
        <SectionTitle>9. AI 기능 이용에 관한 사항</SectionTitle>
        <div className="text-dark/80 leading-relaxed space-y-3">
          <p>덤핏은 이용자가 입력한 텍스트 또는 선택한 일정 정보를 바탕으로 AI 기능을 제공합니다.</p>
          <p>AI 기능은 다음 목적으로 사용됩니다.</p>
          <NumberedList items={['브레인덤프 원문에서 태스크 후보 추출', '태스크 우선순위 분석', '태스크 카테고리 분류', '오늘의 할 일 추천 또는 정렬', '일정 기반 태스크 생성 보조']} />
          <p>AI 분석 과정에서 이용자가 입력한 브레인덤프 원문, 태스크 제목, 설명, 마감일, 예상 소요 시간, Google Calendar에서 선택한 일정명 및 시간 등이 OpenAI API로 전송될 수 있습니다.</p>
          <p>덤핏은 AI 분석에 필요한 최소한의 정보만 전송하기 위해 노력합니다.</p>
          <p>OpenAI API로 전송된 데이터는 기본적으로 OpenAI 모델 학습에 사용되지 않습니다.</p>
          <p>다만, OpenAI의 부정사용 모니터링 정책에 따라 일부 요청 및 응답 데이터가 최대 30일간 보관될 수 있습니다.</p>
          <p>이용자는 민감한 개인정보, 고유식별정보, 금융정보, 건강정보 등 공개되거나 처리될 필요가 없는 정보를 브레인덤프, 태스크 설명, 아이디어, 루틴 등에 입력하지 않는 것이 좋습니다.</p>
        </div>
      </section>

      <section>
        <SectionTitle>10. 쿠키의 설치·운영 및 거부</SectionTitle>
        <div className="text-dark/80 leading-relaxed space-y-3">
          <p>덤핏은 로그인 세션 유지, 서비스 이용 편의 제공, 보안 점검을 위해 쿠키를 사용할 수 있습니다.</p>
          <p>쿠키는 이용자의 브라우저에 저장되는 작은 정보 파일입니다.</p>
          <p>이용자는 브라우저 설정을 통해 쿠키 저장을 거부하거나 삭제할 수 있습니다.</p>
          <p>다만, 쿠키 저장을 거부하는 경우 로그인 유지, 서비스 이용, 보안 기능 등 일부 기능 이용이 제한될 수 있습니다.</p>
        </div>
      </section>

      <section>
        <SectionTitle>11. 이용자의 권리와 행사 방법</SectionTitle>
        <div className="text-dark/80 leading-relaxed space-y-3">
          <p>이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
          <NumberedList items={['개인정보 열람 요청', '개인정보 정정 요청', '개인정보 삭제 요청', '개인정보 처리정지 요청', '회원 탈퇴 및 데이터 삭제 요청', 'Google 연동 해제 요청']} />
          <p>이용자는 서비스 내 마이페이지 또는 개인정보 보호책임자 이메일을 통해 권리를 행사할 수 있습니다.</p>
          <p>덤핏은 이용자의 요청을 확인한 후 관련 법령에 따라 지체 없이 조치합니다.</p>
          <p>다만, 법령상 보관이 필요한 정보 또는 부정 이용 방지와 분쟁 대응을 위해 필요한 로그는 정해진 기간 동안 보관될 수 있습니다.</p>
          <p>Google 계정 권한 철회는 Google 계정의 보안 또는 연결된 앱 관리 화면에서도 직접 수행할 수 있습니다.</p>
        </div>
      </section>

      <section>
        <SectionTitle>12. 개인정보의 안전성 확보 조치</SectionTitle>
        <div className="text-dark/80 leading-relaxed">
          <NumberedList items={['HTTPS(TLS) 기반 암호화 통신 적용', '주요 자격증명 및 API Key의 환경변수 또는 시크릿 관리', '개인정보 처리 시스템 접근 권한 제한', '최소 인원 접근 원칙 적용', '접속 및 처리 로그 관리', '비정상 접근 및 오류 모니터링', '서비스 운영 환경의 보안 설정 관리', '불필요한 개인정보 수집 최소화']} />
        </div>
      </section>

      <section>
        <SectionTitle>13. 개인정보 보호책임자</SectionTitle>
        <div className="text-dark/80 leading-relaxed space-y-3">
          <p>덤핏은 개인정보 처리와 관련한 문의, 열람, 정정, 삭제, 처리정지 요청을 처리하기 위해 아래 담당자를 지정합니다.</p>
          <div className="p-3 bg-accent rounded-lg border border-dark/10">
            <p className="text-sm font-bold text-dark">개인정보 보호책임자 및 고충처리 담당</p>
            <p className="text-sm"><span className="font-bold">담당</span>: 덤핏 운영팀</p>
            <p className="text-sm">
              <span className="font-bold">이메일</span>:{' '}
              <a href="mailto:dumpitadmin@gmail.com" className="text-primary underline">dumpitadmin@gmail.com</a>
            </p>
            <p className="text-sm"><span className="font-bold">처리 업무</span>: 개인정보 관련 문의, 권리 행사 요청, 침해 신고 접수 및 처리</p>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>14. 권익침해 구제 방법</SectionTitle>
        <div className="text-dark/80 leading-relaxed space-y-3">
          <p>이용자는 개인정보 침해에 대한 상담 또는 피해 구제를 위해 아래 기관에 문의할 수 있습니다.</p>
          <div className="space-y-2">
            <DetailBlock title="1. 개인정보침해신고센터" rows={['웹사이트: https://privacy.kisa.or.kr', '전화: 국번 없이 118']} />
            <DetailBlock title="2. 개인정보 분쟁조정위원회" rows={['웹사이트: https://www.kopico.go.kr', '전화: 1833-6972']} />
            <DetailBlock title="3. 대검찰청 사이버수사과" rows={['웹사이트: https://www.spo.go.kr', '전화: 국번 없이 1301']} />
            <DetailBlock title="4. 경찰청 사이버수사국" rows={['웹사이트: https://ecrm.police.go.kr', '전화: 국번 없이 182']} />
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>15. 개인정보처리방침의 변경</SectionTitle>
        <div className="text-dark/80 leading-relaxed space-y-3">
          <p>본 개인정보처리방침은 법령, 서비스 내용, 개인정보 처리 방식의 변경에 따라 수정될 수 있습니다.</p>
          <p>개인정보처리방침이 변경되는 경우 덤핏 서비스 내 공지 또는 개인정보처리방침 페이지를 통해 안내합니다.</p>
          <p>변경된 개인정보처리방침은 고지한 시행일자부터 적용됩니다.</p>
        </div>
      </section>

      <section>
        <SectionTitle>부칙</SectionTitle>
        <div className="text-dark/80 leading-relaxed">
          <p>본 개인정보처리방침은 2026년 5월 7일부터 시행됩니다.</p>
        </div>
      </section>
    </div>
  )
}
