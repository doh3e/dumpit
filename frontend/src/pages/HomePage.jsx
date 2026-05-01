import { Link, useSearchParams } from 'react-router-dom'
import { API_BASE_URL } from '../services/api'

export default function HomePage() {
  const [searchParams] = useSearchParams()
  const loginError = searchParams.get('error')

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/oauth2/authorization/google`
  }

  return (
    <div className="min-h-screen bg-accent flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        {loginError && (
          <div className="card-kitschy bg-primary/10 border-primary mb-6 max-w-md">
            <p className="font-bold text-primary text-sm">
              로그인에 실패했어요. 다시 시도해주세요.
            </p>
          </div>
        )}

        <div className="mb-8">
          <img
            src="/logo.png"
            alt="DumpIt 로고"
            className="w-72 mx-auto drop-shadow-lg"
          />
          <p className="mt-4 text-xl font-extrabold text-dark tracking-wide">
            생각을 쏟아내면, AI가 정리해드려요
          </p>
        </div>

        <div className="max-w-xl mb-12 text-base font-semibold text-dark/70 leading-relaxed">
          <p>
            해야 할 일들이 우주먼지처럼 뒤엉켜 있나요?<br />
          </p>
          <p className="my-4 text-2xl font-bold text-dark/90">
            그냥 다 쏟아내세요!
          </p>
          <p>
            덤핏이 <u>AI</u>를 통해 우선순위를 정하고<br />
            할 일을 알기 쉽게 정리해드려요.
          </p>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="btn-kitschy bg-primary text-white text-lg flex items-center gap-3 mx-auto"
        >
          <svg className="w-5 h-5 drop-shadow-xl" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign with Google
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-20 max-w-3xl w-full">
          {[
            { title: '대시보드', desc: '오늘의 할 일을 대시보드로 한 눈에 파악하기' },
            { title: '브레인 덤프', desc: '줄글로 쏟아내고 AI를 통해 할 일로 정리하기' },
            { title: '아이디어 덤프', desc: '새로운 아이디어를 자유롭게 기록하고 정리하기' },
            { title: '루틴 관리', desc: '반복적으로 해야할 일을 루틴으로 등록해 관리하기' },
            { title: '마이페이지', desc: '자신의 할 일을 어떻게 관리하고 있는지 통계로 확인하기' },
          ].map(({ title, desc }) => (
            <div key={title} className="card-kitschy text-left">
              <h3 className="font-extrabold text-dark text-base mb-1">{title}</h3>
              <p className="text-sm text-dark/60 font-medium">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t-2 border-dark py-5 px-6 text-center">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-sm font-bold text-dark/50">
          <span>&copy; 2026 Dumpit</span>
          <span className="hidden sm:inline text-dark/20">|</span>
          <Link to="/privacy" className="hover:text-primary transition-colors">
            개인정보 처리방침
          </Link>
          <span className="hidden sm:inline text-dark/20">|</span>
          <Link to="/terms" className="hover:text-primary transition-colors">
            서비스 이용약관
          </Link>
          <span className="hidden sm:inline text-dark/20">|</span>
          <a href="mailto:dumpitadmin@gmail.com" className="hover:text-primary transition-colors">
            dumpitadmin@gmail.com
          </a>
        </div>
      </footer>
    </div>
  )
}
