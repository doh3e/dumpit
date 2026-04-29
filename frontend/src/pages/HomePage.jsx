import { useSearchParams } from 'react-router-dom'

export default function HomePage() {
  const [searchParams] = useSearchParams()
  const loginError = searchParams.get('error')

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || '/api'}/oauth2/authorization/google`
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

        <div className="max-w-xl mb-12">
          <p className="text-base font-semibold text-dark/70 leading-relaxed">
            해야 할 일들이 우주먼지처럼 뒤엉켜 있나요?<br />
            <p className="font-bold text-2xl text-dark/90 my-4">
              그냥 다 쏟아내세요!
            </p>
            덤핏이 <u>AI</u>를 통해 우선순위를 정하고<br />
            할 일을 알기 쉽게 정리해드려요.
          </p>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="btn-kitschy bg-primary text-white text-lg flex items-center gap-3 mx-auto"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" drop-shadow-xl>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.6２z" fill="#FBBC05"/>
            <path d="M1２ 5.38c1.6２ 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign with Google
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-20 max-w-3xl w-full">
          {[
            { title: '브레인 덤프', desc: '줄글로 쏟아내면 AI가 할 일 목록으로 정리' },
            { title: '원형 일과표', desc: '24시간 파이차트로 하루를 한눈에 파악' },
            { title: '아이디어 덤프', desc: '새로운 아이디어를 자유롭게 기록하고 정리' },
            { title: '내가 한 일 기록', desc: '얼마나 잘 완료했는지 코인보상과 요약을 통해 보기' },
          ].map(({ title, desc }) => (
            <div key={title} className="card-kitschy text-left">
              <h3 className="font-extrabold text-dark text-base mb-1">{title}</h3>
              <p className="text-sm text-dark/60 font-medium">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t-2 border-dark py-5 text-center">
        <p className="text-sm font-bold text-dark/50">&copy; 2026 Dumpit</p>
      </footer>
    </div>
  )
}
