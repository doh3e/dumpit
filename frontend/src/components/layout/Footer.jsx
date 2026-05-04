import { useState } from 'react'
import { Link } from 'react-router-dom'
import ContactModal from '../ContactModal'

export default function Footer() {
  const [showContact, setShowContact] = useState(false)

  return (
    <>
      <footer className="border-t-2 border-dark/10 bg-accent">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <p className="font-bold text-dark/60">
            &copy; 2026 Dumpit! · 운영자:{' '}
            <a
              href="mailto:dumpitadmin@gmail.com"
              className="text-primary underline"
            >
              dumpitadmin@gmail.com
            </a>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 font-bold">
            <Link
              to="/privacy"
              className="text-dark/60 hover:text-primary transition-colors"
            >
              개인정보 처리방침
            </Link>
            <span className="text-dark/20">|</span>
            <Link
              to="/terms"
              className="text-dark/60 hover:text-primary transition-colors"
            >
              서비스 이용약관
            </Link>
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

      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
    </>
  )
}
