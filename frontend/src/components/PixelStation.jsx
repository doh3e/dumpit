// 마이페이지 "나의 우주정거장" 스프라이트
import { useAuth } from '../context/AuthContext'
import { spriteFor, STATION_SPRITES } from '../shop/registry'

export default function PixelStation() {
  const { user } = useAuth()

  return (
    <div className="flex justify-center pt-1 pb-3" aria-hidden="true">
      <img
        src={spriteFor(STATION_SPRITES, user?.equipments?.STATION).img}
        alt=""
        className="h-16 w-auto"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  )
}
