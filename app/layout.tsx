import './globals.css'
import { Inter, Noto_Sans_Thai } from 'next/font/google'
import type { Metadata } from 'next'

// โหลดฟอนต์อังกฤษ (สไตล์ San Francisco)
const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-inter',
  display: 'swap',
})

// โหลดฟอนต์ไทย (คลีน เรียบหรู สไตล์ Sukhumvit Set)
const notoSansThai = Noto_Sans_Thai({ 
  subsets: ['thai'], 
  variable: '--font-noto-thai',
  display: 'swap',
})

export const metadata: Metadata = { 
  title: 'Badminton Club', 
  description: 'Queue & Court Management' 
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // ยัดตัวแปรฟอนต์เข้าไปใน tag html
    <html lang="th" suppressHydrationWarning className={`${inter.variable} ${notoSansThai.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
