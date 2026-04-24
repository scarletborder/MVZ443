import { useTranslation } from 'react-i18next'
import type { Locale } from '../i18n';

export type { Locale };

interface UseLocaleResult {
    translate: (key: string, params?: Record<string, string>) => string
    loading: boolean
    error: Error | null
}

export function useLocaleMessages(): UseLocaleResult {
    const { t, ready } = useTranslation();

    return {
        translate: (key, params) => t(key, params),
        loading: !ready,
        error: null,
    }
}
