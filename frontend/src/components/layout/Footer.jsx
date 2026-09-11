import { useState } from 'react'
import { Link } from 'react-router-dom'
import ContactModal from '../ContactModal'

export default function Footer() {
  const [showContact, setShowContact] = useState(false)

  return (
    <>
      <footer className="border-t border-line bg-accent">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-6 pb-28 pt-4 text-xs sm:flex-row lg:pb-4">
          <p className="font-bold text-sub">
            &copy; 2026 Dumpit! · 운영자:{' '}
            <a
              href="mailto:dumpitadmin@gmail.com"
              className="text-primary underline"
            >
              dumpitadmin@gmail.com
            </a>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-1 font-bold">
            <Link
              to="/privacy"
              className="inline-flex min-h-[max(44px,2.75rem)] items-center px-2 text-sub transition-colors hover:text-primary"
            >
              개인정보 처리방침
            </Link>
            <span className="text-line">|</span>
            <Link
              to="/terms"
              className="inline-flex min-h-[max(44px,2.75rem)] items-center px-2 text-sub transition-colors hover:text-primary"
            >
              서비스 이용약관
            </Link>
            <span className="text-line">|</span>
            <Link
              to="/account-deletion"
              className="inline-flex min-h-[max(44px,2.75rem)] items-center px-2 text-sub transition-colors hover:text-primary"
            >
              계정 삭제
            </Link>
            <span className="text-line">|</span>
            <button
              type="button"
              onClick={() => setShowContact(true)}
              className="btn-refined btn-refined-text !px-2 text-xs text-sub"
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
