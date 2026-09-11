/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import ShopPage from './ShopPage'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  refreshCoins: vi.fn(),
}))

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    default: {
      get: mocks.get,
      post: mocks.post,
      put: mocks.put,
      delete: mocks.delete,
    },
  }
})

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'tester@example.com', equipments: { BACKGROUND: 'bg.candy' } },
    refreshCoins: mocks.refreshCoins,
  }),
}))

const longName = '아주 긴 한국어 상품명으로 좁은 화면과 큰 글자에서도 카드 바깥으로 넘치지 않아야 하는 은하 배경 테마 상품 이름입니다'
const longDescription = '집중할 내용을 편안하게 구분하면서도 레트로 우주의 분위기를 유지하는 설명입니다. 화면이 좁거나 글자 크기를 키운 경우에도 가격과 보유 상태, 미리보기와 구매 조작을 밀어내지 않고 카드 안에서 자연스럽게 여러 줄로 읽혀야 합니다.'.repeat(2)

const backgroundItems = [
  {
    code: 'bg.candy',
    name: '캔디 배경',
    description: '보유한 배경',
    price: 90,
    type: 'THEME',
    slot: 'BACKGROUND',
    tier: 'COLOR',
    owned: true,
    equipped: true,
  },
  {
    code: 'bg.galaxy',
    name: longName,
    description: longDescription,
    price: 120,
    type: 'THEME',
    slot: 'BACKGROUND',
    tier: 'COLOR',
    owned: false,
    equipped: false,
  },
]

const planetItem = {
  code: 'planet.galaxy',
  name: '나선 은하',
  description: '대시보드에서 만나는 행성',
  price: 150,
  type: 'THEME',
  slot: 'PLANET',
  tier: 'CONCEPT',
  owned: true,
  equipped: false,
}

function catalog(coinBalance = 300) {
  return { data: { coinBalance, items: [...backgroundItems, planetItem] } }
}

beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  }
})

describe('ShopPage', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    localStorage.setItem('dumpit_equipments', JSON.stringify({ BACKGROUND: 'bg.candy' }))
    mocks.get.mockReset().mockResolvedValue(catalog())
    mocks.post.mockReset().mockResolvedValue({ data: {} })
    mocks.put.mockReset().mockResolvedValue({ data: {} })
    mocks.delete.mockReset().mockResolvedValue({ data: {} })
    mocks.refreshCoins.mockReset()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    delete document.documentElement.dataset.skinBg
    vi.restoreAllMocks()
  })

  it('refined 상점 표현에서 긴 상품 정보를 감싸고 배경 미리보기를 적용·취소한다', async () => {
    render(<ShopPage />)

    const heading = await screen.findByRole('heading', { level: 1, name: '코인샵' })
    expect(heading).toHaveClass('page-refined-heading')
    expect(heading.parentElement.parentElement).not.toHaveClass('px-4', 'py-8')
    const preview = screen.getAllByRole('button', { name: '미리보기' })[0]
    expect(preview).toHaveClass('btn-refined')
    expect(screen.getByRole('heading', { level: 3, name: '보유중' })).toHaveClass('font-galmuri')
    expect(screen.getByText(longName)).toHaveClass('break-words')
    expect(screen.getByText(longDescription)).toHaveClass('break-words')
    expect(screen.getByText(longName).closest('.surface-refined')).toHaveClass('min-w-0')

    expect(document.documentElement.dataset.skinBg).toBe('candy')
    fireEvent.click(preview)
    expect(document.documentElement.dataset.skinBg).toBe('galaxy')
    fireEvent.click(screen.getByRole('button', { name: '미리보기 취소' }))
    expect(document.documentElement.dataset.skinBg).toBe('candy')
  })

  it('PLANET 미리보기는 refined Dialog로 열고 실제 THEME 장착 API를 유지한다', async () => {
    render(<ShopPage />)
    await screen.findByRole('heading', { name: '코인샵' })
    fireEvent.click(screen.getByRole('button', { name: '행성' }))
    fireEvent.click(screen.getByRole('button', { name: '미리보기' }))

    const dialog = screen.getByRole('dialog', { name: '나선 은하' })
    expect(dialog.firstElementChild).toHaveClass('surface-refined', 'p-5')
    expect(within(dialog).getByRole('button', { name: '닫기' })).toHaveClass('btn-refined')
    fireEvent.click(within(dialog).getByRole('button', { name: '닫기' }))

    const equip = screen.getByRole('button', { name: '장착하기' })
    expect(equip).toHaveClass('btn-refined')
    fireEvent.click(equip)
    await waitFor(() => expect(mocks.put).toHaveBeenCalledWith('/shop/equip', { code: 'planet.galaxy' }))
  })

  it('코인 가격과 구매 실패 재시도 정책을 보존한다', async () => {
    mocks.post.mockRejectedValue({ response: { data: { message: '잔액 처리 중 오류가 발생했어요.' } } })
    render(<ShopPage />)
    await screen.findByRole('heading', { name: '코인샵' })

    expect(screen.getByText('120')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '구매' }))
    const dialog = screen.getByRole('dialog', { name: longName })
    expect(dialog.firstElementChild).toHaveClass('surface-refined', 'p-5')
    expect(within(dialog).getByRole('heading', { level: 2, name: longName })).toHaveClass('font-galmuri')
    expect(within(dialog).getByRole('button', { name: '취소' })).toHaveClass('btn-refined')
    expect(within(dialog).getByRole('button', { name: '구매하기' })).toHaveClass('btn-refined', 'btn-refined-primary')

    fireEvent.click(within(dialog).getByRole('button', { name: '구매하기' }))
    expect(await within(dialog).findByText('잔액 처리 중 오류가 발생했어요.')).toHaveAttribute('role', 'alert')
    expect(mocks.post).toHaveBeenCalledWith('/shop/purchase', { code: 'bg.galaxy' })
    fireEvent.click(within(dialog).getByRole('button', { name: '구매하기' }))
    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(2))
  })

  it('코인이 부족하면 기존 가격을 유지하고 구매를 막는다', async () => {
    mocks.get.mockResolvedValue(catalog(100))
    render(<ShopPage />)
    await screen.findByRole('heading', { name: '코인샵' })

    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '코인 부족' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '코인 부족' })).toHaveClass('btn-refined')
    expect(mocks.post).not.toHaveBeenCalled()
  })
})
