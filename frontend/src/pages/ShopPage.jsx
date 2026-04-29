export default function ShopPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="heading-kitschy text-2xl">코인샵</h2>
        <p className="mt-2 text-sm font-semibold text-dark/60">
          열심히 모은 코인을 사용할 공간을 준비하고 있어요.
        </p>
      </div>

      <section className="card-kitschy min-h-[28rem] flex items-center justify-center text-center">
        <div className="max-w-md">
          <p className="text-xl font-black text-dark">코인샵 준비 중</p>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-dark/60">
            추후 다양한 테마와 스티커를 코인으로 교환할 수 있게 열어둘 예정이에요.
            지금은 할 일을 완료하며 코인을 차곡차곡 모아주세요.
          </p>
        </div>
      </section>
    </div>
  )
}
