import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import HideNavbar from '@/components/HideNavbar'
import Image from 'next/image'

export default function NotFound() {
    return (
        <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
            <HideNavbar />

            {/* Background Image using Next/Image */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/broken-pot.jpg"
                    alt="Broken pot in desert"
                    fill
                    className="object-cover object-center"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/20"></div>
            </div>

            {/* Content - Positioned Center */}
            <div className="relative z-10 w-full max-w-lg text-center px-4 text-white">

                <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">Page Not Found</h1>

                <p className="text-lg md:text-xl text-white/90 font-medium mb-8 leading-relaxed shadow-sm">
                    Looks like you&apos;ve wandered into uncharted territory.
                </p>

                <Link
                    href="/"
                    className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-full text-white font-semibold hover:bg-[var(--heritage-gold)] hover:border-[var(--heritage-gold)] transition-all duration-300 group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span>Back to home</span>
                </Link>
            </div>
        </div>
    )
}
