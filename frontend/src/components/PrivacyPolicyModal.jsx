import { createPortal } from 'react-dom'
import PrivacyPolicyContent, { PRIVACY_POLICY_EFFECTIVE_DATE } from './PrivacyPolicyContent'

export default function PrivacyPolicyModal({ onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-dark/40" onClick={onClose} />

      <div className="relative card-kitschy w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading-kitschy text-xl">개인정보처리방침</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border-2 border-dark font-black text-dark text-sm hover:bg-primary hover:text-white transition-colors"
          >
            X
          </button>
        </div>

        <div className="mb-3 text-xs text-dark/60 font-semibold space-y-1">
          <p>덤핏(Dumpit!, 이하 “덤핏”)은 이용자의 개인정보를 중요하게 생각하며, 「개인정보 보호법」 등 관련 법령을 준수하기 위해 다음과 같이 개인정보처리방침을 수립·공개합니다.</p>
          <p>본 개인정보처리방침은 덤핏 웹 서비스(https://dumpit.kr)에 적용됩니다.</p>
          <p>시행일자: {PRIVACY_POLICY_EFFECTIVE_DATE}</p>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          <PrivacyPolicyContent />
        </div>
      </div>
    </div>,
    document.body
  )
}
