import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import { join } from 'path'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  const imgData = readFileSync(join(process.cwd(), 'public/SIMBOLO-BRANCO.png'))
  const src = `data:image/png;base64,${imgData.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0A0A0A',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={24} height={24} alt="" />
      </div>
    ),
    { ...size }
  )
}
