import { Link } from 'react-router-dom'
import PrivacyPolicyContent, { PRIVACY_POLICY_EFFECTIVE_DATE } from '../components/PrivacyPolicyContent'

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
            <h1 className="heading-kitschy text-2xl">개인정보처리방침</h1>
            <p className="text-sm text-dark/80 font-semibold mt-3">
              덤핏(Dumpit!, 이하 “덤핏”)은 이용자의 개인정보를 중요하게 생각하며, 「개인정보 보호법」 등 관련 법령을 준수하기 위해 다음과 같이 개인정보처리방침을 수립·공개합니다.
            </p>
            <p className="text-sm text-dark/80 font-semibold mt-2">
              본 개인정보처리방침은 덤핏 웹 서비스(https://dumpit.kr)에 적용됩니다.
            </p>
            <p className="text-xs text-dark/60 font-semibold mt-2">시행일자: {PRIVACY_POLICY_EFFECTIVE_DATE}</p>
          </div>

          <PrivacyPolicyContent />
        </div>
      </div>
    </div>
  )
}
