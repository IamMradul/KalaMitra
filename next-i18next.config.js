import path from 'path'

export default {
  i18n: {
    defaultLocale: 'en',
    locales: [
      'en', 'hi', 'assamese', 'bengali', 'bodo', 'dogri', 'gujarati', 
      'kannad', 'kashmiri', 'konkani', 'maithili', 'malyalam', 
      'manipuri', 'marathi', 'nepali', 'oriya', 'punjabi', 'sanskrit', 
      'santhali', 'sindhi', 'tamil', 'telgu', 'urdu'
    ],
    localeDetection: true,
  },
  localePath: path.resolve('./src/lib/locales'),
  reloadOnPrerender: process.env.NODE_ENV === 'development',
}
