import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './locales/zh_CN';
import enUS from './locales/en_US';

export type Locale = 'zh_CN' | 'en_US';

export const DEFAULT_LOCALE: Locale = 'zh_CN';

export const resources = {
  zh_CN: {
    translation: zhCN,
  },
  en_US: {
    translation: enUS,
  },
} as const;

const getInitialLocale = (): Locale => {
  try {
    const value = document.cookie
      .split('; ')
      .find(row => row.startsWith('language='));
    return value ? JSON.parse(value.split('=')[1]) : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
};

void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLocale(),
    fallbackLng: DEFAULT_LOCALE,
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  });

export const changeLocale = (locale: Locale) => {
  void i18n.changeLanguage(locale);
};

export const translate = (key: string, params?: Record<string, string | number>) => {
  return i18n.t(key, params);
};

export default i18n;
