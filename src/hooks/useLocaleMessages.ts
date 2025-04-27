// useLocaleMessages.ts
import { useState, useEffect, useCallback } from 'react'
import { publicUrl } from '../utils/browser';
import { useSettings } from '../context/settings_ctx';

export type Locale = "zh_CN" | "en_US"; // 支持的语言类型

// 动态加载语言文件
async function loadLocale(locale: Locale): Promise<Record<string, string>> {
    try {
        const messages = await import(/* @vite-ignore */`${publicUrl}/locales/${locale}.js`); // 动态加载语言包 
        return messages.default; // 返回语言文件中的默认对象
    } catch (error) {
        console.error(`fail to load language: ${locale}: ${error}`);
        return {}; // 如果加载失败，返回空对象
    }
};

interface UseLocaleResult {
    /** 翻译函数：传入 key 和可选的占位符 params */
    translate: (key: string, params?: Record<string, string>) => string
    /** 是否正在加载 */
    loading: boolean
    /** 加载过程中出现的错误 */
    error: Error | null
}

export function useLocaleMessages(): UseLocaleResult {
    const { language: locale } = useSettings();
    const [map, setMap] = useState<Map<string, string>>(new Map())
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        let mounted = true
        async function fetchMessages() {
            setLoading(true)
            try {
                const obj = await loadLocale(locale)
                const m = new Map<string, string>(Object.entries(obj))
                if (mounted) {
                    setMap(m)
                    setError(null)
                }
            } catch (e: any) {
                if (mounted) {
                    setError(e)
                    setMap(new Map())
                }
            } finally {
                if (mounted) {
                    setLoading(false)
                }
            }
        }
        fetchMessages()
        return () => { mounted = false }
    }, [locale])

    const translate = useCallback(
        (key: string, params?: Record<string, string>) => {
            // 先取出模板，找不到就直接返回 key 本身
            let template = map.get(key) ?? key
            // 如果有占位符参数，就做简单替换：{foo} => params.foo
            if (params) {
                Object.entries(params).forEach(([k, v]) => {
                    template = template.replace(new RegExp(`\\{${k}\\}`, 'g'), v)
                })
            }
            return template
        },
        [map]
    )

    return { translate, loading, error }
}
