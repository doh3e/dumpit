import { useState } from 'react'
import PrivacyPolicyModal from '../PrivacyPolicyModal'
import ContactModal from '../ContactModal'

export default function Footer() {
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showContact, setShowContact] = useState(false)

  return (
    <>
      <footer className="border-t-2 border-dark/10 bg-accent">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <p className="font-bold text-dark/60">
            © 2026 덤핏 (Dumpit) · 운영팀:{' '}
            <a
              href="mailto:dumpitadmin@gmail.com"
              className="text-primary underline"
            >
              dumpitadmin@gmail.com
            </a>
          </p>
          <div className="flex items-center gap-3 font-bold">
            <button
              type="button"
              onClick={() => setShowPrivacy(true)}
              className="text-dark/60 hover:text-primary transition-colors"
            >
              개인정보 처리방침
            </button>
            <span className="text-dark/20">|</span>
            <button
              type="button"
              onClick={() => setShowContact(true)}
              className="text-dark/60 hover:text-primary transition-colors"
            >
              문의하기
            </button>
          </div>
        </div>
      </footer>

      {showPrivacy && <PrivacyPolicyModal onClose={() => setShowPrivacy(false)} />}
      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
    </>
  )
}
