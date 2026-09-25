'use client'

import { useEffect, useState } from 'react'

export default function ThinkTechCore() {
  const [isTampered, setIsTampered] = useState(false)

  useEffect(() => {
    // 1. Print ASCII Art to console
    console.log(
      '%c' + `
  _______ _     _       _  _______        _     
 |__   __| |   (_)     | ||__   __|      | |    
    | |  | |__  _ _ __ | | __| | ___  ___| |__  
    | |  | '_ \\| | '_ \\| |/ /| |/ _ \\/ __| '_ \\ 
    | |  | | | | | | | |   < | |  __/ (__| | | |
    |_|  |_| |_|_|_| |_|_|\\_\\|_|\\___|\\___|_| |_|
`,
      'color: #f59e0b; font-weight: bold; font-family: monospace; font-size: 14px;'
    )
    console.log(
      '%cStop snooping! Built with ❤️ by Apoorv & Mradul.',
      'color: #dc2626; font-size: 16px; font-weight: bold;'
    )

    // 2. Anti-Tamper Protection
    const interval = setInterval(() => {
      // Check for the ThinkTech badge
      const badge = document.querySelector('[aria-label="Made with ThinkTech - See creators"]');

      // Also do a fallback check if someone just removes the aria-label
      const bodyText = document.body.innerText || '';
      const hasThinkTech = bodyText.includes('ThinkTech');

      if (!badge && !hasThinkTech) {
        setIsTampered(true);
      } else {
        setIsTampered(false);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [])

  if (isTampered) {
    return (
      <div className="fixed inset-0 z-[999999] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center text-white p-8 font-sans">
        <h1 className="text-4xl md:text-5xl font-bold text-red-500 mb-6 text-center">
          Unlicensed Version
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl text-center leading-relaxed">
          The developer attribution has been tampered with or removed.
          This project was engineered by <span className="font-bold text-orange-400">Team ThinkTech (Mradul & Apoorv)</span>.
          <br /><br />
          Please restore the original attribution badges to continue using this software.
        </p>
      </div>
    )
  }

  return null
}
