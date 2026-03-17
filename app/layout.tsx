import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import { Metadata } from 'next'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'Contabilidade Voz - Assistente de Estudo',
  description: 'Aprenda contabilidade conversando com IA em tempo real.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-stone-50 text-stone-900 antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
