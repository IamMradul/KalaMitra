'use client'

export default function HideNavbar() {
  return (
    <style jsx global>{`
      nav.glass-nav,
      footer {
        display: none !important;
      }
    `}</style>
  )
}
