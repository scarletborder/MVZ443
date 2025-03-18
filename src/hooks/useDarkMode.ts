import { useState, useEffect } from 'react';

const useDarkMode = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        // 创建一个 media query 监听系统的色彩模式
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        // 根据当前系统主题设置初始状态
        setIsDarkMode(mediaQuery.matches);

        // 当系统主题变化时，更新状态
        const handleChange = (e: { matches: boolean | ((prevState: boolean) => boolean); }) => setIsDarkMode(e.matches);
        mediaQuery.addEventListener('change', handleChange);

        // 清理函数：组件卸载时移除事件监听
        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, []);

    return isDarkMode;
};

export default useDarkMode;
