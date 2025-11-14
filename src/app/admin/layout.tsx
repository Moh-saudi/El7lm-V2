export const metadata = {
  title: 'El7lm - لوحة الإدارة',
  description: 'لوحة إدارة منصة El7lm',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
    </>
  )
}
