// 마이페이지 "나의 우주정거장" 스프라이트
import { useAuth } from '../context/AuthContext'
import PixelSprite from './PixelSprite'
import { spriteFor, STATION_SPRITES } from '../shop/registry'

export default function PixelStation() {
  const { user } = useAuth()

  return (
    <div className="flex justify-center pt-1 pb-3" aria-hidden="true">
      <PixelSprite
        sprite={spriteFor(STATION_SPRITES, user?.equipments?.STATION)}
        className="w-16 h-16"
      />
    </div>
  )
}
