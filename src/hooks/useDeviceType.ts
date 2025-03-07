// src/hooks/useDeviceType.ts
import { useState, useEffect } from 'react';

export const useDeviceType = (): 'mobile' | 'pc' => {
    const [deviceType, setDeviceType] = useState<'mobile' | 'pc'>('pc');

    const checkDevice = () => {
        const userAgent = navigator.userAgent.toLowerCase();
        const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
        const isSmallScreen = window.innerWidth <= 768; // 假设 768px 为移动端阈值

        setDeviceType(isMobile || isSmallScreen ? 'mobile' : 'pc');
    };

    useEffect(() => {
        checkDevice(); // 初次检查
        window.addEventListener('resize', checkDevice); // 监听窗口大小变化
        return () => window.removeEventListener('resize', checkDevice);
    }, []);

    return deviceType;
};
