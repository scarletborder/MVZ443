import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { debounce } from '../utils/debounce';

interface GameSettings {
    isFullScreen: boolean;
    width: number; // width
    language: string;
    isBluePrint: boolean;
    toggleFullScreen: () => void;
    setWidth: (newWidth: number) => void;
    toggleLanguage: () => void;
    setIsBluePrint: (isBluePrint: boolean) => void;

    exportAsJson: () => string;
    importFromJson: (jsonString: string) => void;
}

const SettingsContext = createContext<GameSettings | undefined>(undefined);


interface Props {
    children: ReactNode
}

export function SettingsProvider(props: Props) {
    const { children } = props;
    // 全屏状态
    const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
    // 分辨率width(4:3)
    const [width, setWidth] = useState<number>(800);
    // 当前语言，示例在英文和中文之间切换
    const [language, setLanguage] = useState<string>('en');
    // 是否开启私密蓝图模式
    const [isBluePrint, setIsBluePrintStatus] = useState<boolean>(false);

    const setIsBluePrint = (isBluePrint: boolean) => {
        debounce((newVal) => setIsBluePrintStatus(newVal), 50)(isBluePrint);
    }

    // 切换全屏
    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                setIsFullScreen(true);
            }).catch(err => {
                console.error("开启全屏失败:", err);
            });
        } else {
            document.exitFullscreen().then(() => {
                setIsFullScreen(false);
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


    // 切换语言（示例在英文和中文间切换）
    const toggleLanguage = () => {
        setLanguage(prev => (prev === 'en' ? 'zh' : 'en'));
    };

    const settingsValue: GameSettings = {
        isFullScreen,
        width,
        language,
        isBluePrint,
        toggleFullScreen,
        setWidth,
        toggleLanguage,
        setIsBluePrint,
        exportAsJson,
        importFromJson
    };

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
