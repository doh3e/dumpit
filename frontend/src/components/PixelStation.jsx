import { useAuth } from '../hooks/useAuth'
import PixelSprite from './PixelSprite'
import { stationSpriteFor } from '../shop/registry'

export default function PixelStation() {
  const { user } = useAuth()

  return (
    <div className="flex justify-center pt-1 pb-3" aria-hidden="true">
      <PixelSprite
        sprite={stationSpriteFor(user?.equipments?.STATION, user?.equipmentVariants?.STATION)}
        className="w-16 h-16"
      />
    </div>
  )
}
