// © ThinkTech — KalaMitra — 2026
import Image from 'next/image';
import Link from 'next/link';
import creatorsData from '@/data/creators.json';
import { Github, Linkedin, Twitter, Instagram, Globe } from 'lucide-react';

export const metadata = {
  title: 'See Creators | Built by ThinkTech',
  description: 'Meet the creators behind KalaMitra - Team ThinkTech',
};

export default function CreatorsPage() {
  return (
    <div className="min-h-screen py-24 px-4 bg-[var(--bg-1)]">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold font-cormorant text-transparent bg-clip-text bg-gradient-to-r from-[var(--heritage-gold)] to-[var(--heritage-red)] mb-4">
            Team ThinkTech
          </h1>
          <p className="text-lg text-[var(--muted)]">
            Meet the passionate minds behind KalaMitra, blending tradition with modern AI technology.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          {creatorsData.map((creator, index) => (
            <div
              key={index}
              className="bg-[var(--bg-2)] border border-[var(--border)] rounded-2xl p-6 flex flex-col items-center shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-2 border-[var(--heritage-gold)]">
                <Image
                  src={creator.photo}
                  alt={`${creator.name} profile photo`}
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                />
              </div>
              <h2 className="text-2xl font-semibold text-[var(--text)] mb-2 font-nunito">{creator.name}</h2>
              <div className="flex gap-4 mt-4">
                <a
                  href={creator.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--muted)] hover:text-[var(--heritage-gold)] transition-colors"
                  aria-label={`${creator.name}'s GitHub`}
                >
                  <Github size={24} />
                </a>
                {creator.social.map((s, i) => {
                  let Icon = Globe;
                  if (s.platform === 'linkedin') Icon = Linkedin;
                  else if (s.platform === 'twitter') Icon = Twitter;
                  else if (s.platform === 'instagram') Icon = Instagram;

                  return (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--muted)] hover:text-[var(--heritage-gold)] transition-colors"
                      aria-label={`${creator.name}'s ${s.platform}`}
                    >
                      <Icon size={24} />
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
