// src/hooks/useDeviceType.ts
export const useDeviceType = (): 'mobile' | 'pc' => {
    const isMobile = window.orientation !== undefined; // 假设移动设备都有 orientation 属性
    const isSmallScreen = window.innerWidth <= 768; // 假设 768px 为移动端阈值
    const isMobilePlatform = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|arm/i.test(navigator.userAgent);

    return (isMobile || isSmallScreen || isMobilePlatform ? 'mobile' : 'pc');
};
