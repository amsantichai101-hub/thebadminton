import './globals.css'
import { Inter, Noto_Sans_Thai } from 'next/font/google'
import type { Metadata } from 'next'
import InstallPWA from '@/components/InstallPWA'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const notoSansThai = Noto_Sans_Thai({ subsets: ['thai'], variable: '--font-noto-thai', display: 'swap' })

export const metadata: Metadata = { 
  title: 'Badminton Club', 
  description: 'Queue & Court Management',
  manifest: '/manifest.json', // 🌟 สำคัญมากสำหรับ iPhone
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning className={`${inter.variable} ${notoSansThai.variable}`}>
      <body className="font-sans antialiased">{children}
        <InstallPWA />
      </body>
    </html>
  )
}