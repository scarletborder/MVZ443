import React, { createContext, ReactNode, useCallback, useContext, useState, useEffect } from 'react';
import { debounce } from '../utils/debounce';
import { Locale } from '../utils/i18n';

// 加载 cookie 中的值，如果没有则返回默认值
const loadCookie = <T,>(key: string, defaultValue: T): T => {
    const value = document.cookie
        .split('; ')
        .find(row => row.startsWith(key + '='));
    return value ? JSON.parse(value.split('=')[1]) : defaultValue;
};

// 存储值到 cookie
const storeCookie = <T,>(key: string, value: T): void => {
    document.cookie = `${key}=${JSON.stringify(value)}; path=/; max-age=31536000`; // 1 year expiration
};

interface GameSettings {
    isFullScreen: boolean;
    width: number; // width
    language: Locale;
    isBluePrint: boolean;
    isDebug: boolean;
    isBgm: boolean;

    linkOptions: {
        baseUrl: string;
        key: string;
    };

    toggleFullScreen: () => void;
    setWidth: (newWidth: number) => void;
    toggleLanguage: (lang: Locale) => void;
    setIsBluePrint: (isBluePrint: boolean) => void;
    setIsDebug: (isDebug: boolean) => void;
    setIsBgm: (isBgm: boolean) => void;

    setLinkOptions: (baseUrl: string, key: string) => void;

    exportAsJson: () => string;
    importFromJson: (jsonString: string) => void;
}

const SettingsContext = createContext<GameSettings | undefined>(undefined);

interface Props {
    children: ReactNode
}

export function SettingsProvider(props: Props) {
    const { children } = props;

    // 从 cookie 中加载初始值
    const [isFullScreen, setIsFullScreen] = useState<boolean>(loadCookie('isFullScreen', false));
    const [width, setWidth] = useState<number>(loadCookie('width', 800));
    const [language, setLanguage] = useState<Locale>(loadCookie('language', 'zh_CN'));
    const [isBluePrint, setIsBluePrintStatus] = useState<boolean>(loadCookie('isBluePrint', false));
    const [isDebug, setIsDebug] = useState<boolean>(loadCookie('isDebug', false));
    const [isBgm, setIsBgmStatus] = useState<boolean>(loadCookie('isBgm', true));
    const [linkOptions, setLinkOptionsStatus] = useState<{ baseUrl: string; key: string }>(loadCookie('linkOptions', { baseUrl: '', key: '' }));


    // 更新并存储到 cookie
    const setIsBluePrint = (isBluePrint: boolean) => {
        debounce((newVal) => {
            setIsBluePrintStatus(newVal);
            storeCookie('isBluePrint', newVal); // 存储到 cookie
        }, 50)(isBluePrint);
    };

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                setIsFullScreen(true);
                storeCookie('isFullScreen', true); // 存储到 cookie
            }).catch(err => {
                console.error("开启全屏失败:", err);
            });
        } else {
            document.exitFullscreen().then(() => {
                setIsFullScreen(false);
                storeCookie('isFullScreen', false); // 存储到 cookie
            }).catch(err => {
                console.error("退出全屏失败:", err);
            });
        }
    };

    const exportAsJson = useCallback(() => {
        return JSON.stringify({
            isFullScreen,
            width,
            language,
            isBluePrint
        });
    }, [isFullScreen, width, language, isBluePrint]);

    const importFromJson = (jsonString: string) => {
        const data = JSON.parse(jsonString);
        setIsFullScreen(data.isFullScreen);
        setWidth(data.width);
        setLanguage(data.language);
        setIsBluePrint(data.isBluePrint);
    }

    const toggleLanguage = (lang: Locale) => {
        setLanguage(lang);
        storeCookie('language', lang); // 存储到 cookie
    };

    const setIsBgm = (isBgm: boolean) => {
        debounce((newVal) => {
            setIsBgmStatus(newVal);
            storeCookie('isBgm', newVal); // 存储到 cookie
        }, 50)(isBgm);
    };

    const setLinkOptions = (baseUrl: string, key: string) => {
        debounce((newBaseUrl, newKey) => {
            setLinkOptionsStatus({ baseUrl: newBaseUrl, key: newKey });
            storeCookie('linkOptions', { baseUrl: newBaseUrl, key: newKey }); // 存储到 cookie
        }, 50)(baseUrl, key);
    };

    const settingsValue: GameSettings = {
        isFullScreen,
        width,
        language,
        isBluePrint,
        isDebug,
        isBgm,
        linkOptions,
        toggleFullScreen,
        setWidth,
        toggleLanguage,
        setIsBluePrint,
        exportAsJson,
        importFromJson,
        setIsDebug,
        setIsBgm,
        setLinkOptions,
    };

    useEffect(() => {
        // 页面初始化时从 cookie 加载设置
        setIsFullScreen(loadCookie('isFullScreen', false));
        setWidth(loadCookie('width', 800));
        setLanguage(loadCookie('language', 'zh_CN'));
        setIsBluePrintStatus(loadCookie('isBluePrint', false));
        setIsDebug(loadCookie('isDebug', false));
        setIsBgm(loadCookie('isBgm', true));
    }, []);

    return (
        <SettingsContext.Provider value={settingsValue}>
            {children}
        </SettingsContext.Provider>
    );
};

// 自定义 Hook 用于访问设置
export const useSettings = (): GameSettings => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error("useSettings 必须在 SettingsProvider 内部使用");
    }
    return context;
};
