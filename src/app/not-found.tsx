'use client'

import Link from 'next/link'
import { Home, Search } from 'lucide-react'
import HideNavbar from '@/components/HideNavbar'
import Image from 'next/image'

export default function NotFound() {
    return (
        <div className="relative min-h-screen overflow-hidden flex items-center justify-center bg-black">
            <HideNavbar />

            {/* Background Image with Parallax Effect */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/notfound.png"
                    alt="Broken pot in desert"
                    fill
                    className="object-cover object-center scale-105 animate-subtle-zoom"
                    priority
                    quality={90}
                />
                {/* Enhanced gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/40 to-black/75"></div>
                {/* Vignette effect */}
                <div className="absolute inset-0 opacity-60" style={{
                    background: 'radial-gradient(circle at center, transparent 0%, transparent 50%, black 100%)'
                }}></div>
            </div>

            {/* Floating particles effect */}
            <div className="absolute inset-0 z-[1] pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full animate-float-slow"></div>
                <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-white/30 rounded-full animate-float-delayed"></div>
                <div className="absolute bottom-1/4 left-1/2 w-1.5 h-1.5 bg-white/25 rounded-full animate-float"></div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-2xl text-center px-6 animate-fade-in-up">
                
                {/* 404 Number - Large and Stylized */}
                <div className="mb-6">
                    <h2 className="text-8xl md:text-9xl font-black text-white/10 tracking-tight leading-none select-none" 
                        style={{ textShadow: '0 0 40px rgba(255,255,255,0.1)' }}>
                        404
                    </h2>
                </div>

                {/* Main Heading */}
                <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white drop-shadow-2xl tracking-tight">
                    Lost in the Sands
                </h1>

                {/* Description */}
                <p className="text-lg md:text-xl text-white/90 font-medium mb-4 leading-relaxed max-w-md mx-auto">
                    Like fragments of a broken pot, this page has scattered into the digital desert.
                </p>
                
                <p className="text-sm md:text-base text-white/70 mb-10 max-w-sm mx-auto">
                    The path you seek doesn&apos;t exist, but we can guide you back home.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Link
                        href="/"
                        className="group relative inline-flex items-center gap-3 bg-[var(--heritage-gold)] px-8 py-4 rounded-full text-white font-semibold hover:bg-[var(--heritage-gold)]/90 transition-all duration-300 shadow-2xl hover:shadow-[var(--heritage-gold)]/50 hover:scale-105 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                        <Home className="w-5 h-5 group-hover:scale-110 transition-transform relative z-10" />
                        <span className="relative z-10">Return Home</span>
                    </Link>

                    
                </div>

                {/* Alternative Navigation */}
                <div className="mt-12 pt-8 border-t border-white/10">
                    <p className="text-sm text-white/60 mb-4">Or explore these sections:</p>
                    <div className="flex flex-wrap gap-3 justify-center">
                        <Link href="/marketplace" className="text-sm text-white/80 hover:text-[var(--heritage-gold)] transition-colors duration-200 hover:underline underline-offset-4">
                            Marketplace
                        </Link>
                        <span className="text-white/30">•</span>
                        <Link href="/auth/signin" className="text-sm text-white/80 hover:text-[var(--heritage-gold)] transition-colors duration-200 hover:underline underline-offset-4">
                            Join Us
                        </Link>
                        <span className="text-white/30">•</span>
                        <Link href="/about" className="text-sm text-white/80 hover:text-[var(--heritage-gold)] transition-colors duration-200 hover:underline underline-offset-4">
                            About Us
                        </Link>
                        <span className="text-white/30">•</span>
                        <Link href="/contact" className="text-sm text-white/80 hover:text-[var(--heritage-gold)] transition-colors duration-200 hover:underline underline-offset-4">
                            Contact
                        </Link>
                    </div>
                </div>
            </div>

            {/* Global styles for animations */}
            <style jsx global>{`
                @keyframes fade-in-up {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes subtle-zoom {
                    0%, 100% {
                        transform: scale(1.05);
                    }
                    50% {
                        transform: scale(1.08);
                    }
                }

                @keyframes float {
                    0%, 100% {
                        transform: translateY(0) translateX(0);
                        opacity: 0.3;
                    }
                    50% {
                        transform: translateY(-20px) translateX(10px);
                        opacity: 0.6;
                    }
                }

                @keyframes float-slow {
                    0%, 100% {
                        transform: translateY(0) translateX(0);
                        opacity: 0.2;
                    }
                    50% {
                        transform: translateY(-30px) translateX(-15px);
                        opacity: 0.5;
                    }
                }

                @keyframes float-delayed {
                    0%, 100% {
                        transform: translateY(0) translateX(0);
                        opacity: 0.25;
                    }
                    50% {
                        transform: translateY(-25px) translateX(20px);
                        opacity: 0.55;
                    }
                }

                .animate-fade-in-up {
                    animation: fade-in-up 0.8s ease-out forwards;
                }

                .animate-subtle-zoom {
                    animation: subtle-zoom 20s ease-in-out infinite;
                }

                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }

                .animate-float-slow {
                    animation: float-slow 8s ease-in-out infinite;
                }

                .animate-float-delayed {
                    animation: float-delayed 7s ease-in-out infinite 2s;
                }
            `}</style>
        </div>
    )
}