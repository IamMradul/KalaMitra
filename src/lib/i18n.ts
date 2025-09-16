import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import hi from './locales/hi.json';
import assamese from './locales/assamese.json';
import bengali from './locales/bengali.json';
import bodo from './locales/bodo.json';
import dogri from './locales/dogri.json';
import gujarati from './locales/gujarati.json';
import kannad from './locales/kannad.json';
import kashmiri from './locales/kashmiri.json';
import konkani from './locales/konkani.json';
import maithili from './locales/maithili.json';
import malyalam from './locales/malyalam.json';
import manipuri from './locales/manipuri.json';
import marathi from './locales/marathi.json';
import nepali from './locales/nepali.json';
import oriya from './locales/oriya.json';
import punjabi from './locales/punjabi.json';
import sanskrit from './locales/sanskrit.json';
import santhali from './locales/santhali.json';
import sindhi from './locales/sindhi.json';
import tamil from './locales/tamil.json';
import telgu from './locales/telgu.json';
import urdu from './locales/urdu.json';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  assamese: { translation: assamese },
  bengali: { translation: bengali },
  bodo: { translation: bodo },
  dogri: { translation: dogri },
  gujarati: { translation: gujarati },
  kannad: { translation: kannad },
  kashmiri: { translation: kashmiri },
  konkani: { translation: konkani },
  maithili: { translation: maithili },
  malyalam: { translation: malyalam },
  manipuri: { translation: manipuri },
  marathi: { translation: marathi },
  nepali: { translation: nepali },
  oriya: { translation: oriya },
  punjabi: { translation: punjabi },
  sanskrit: { translation: sanskrit },
  santhali: { translation: santhali },
  sindhi: { translation: sindhi },
  tamil: { translation: tamil },
  telgu: { translation: telgu },
  urdu: { translation: urdu },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Default language
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    // Better production support
    detection: {
      order: ['cookie', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['cookie', 'localStorage'],
      cookieMinutes: 60 * 24 * 365, // 1 year
      cookieDomain: process.env.NODE_ENV === 'production' ? '.vercel.app' : 'localhost',
      cookieOptions: {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  });

export default i18n;
