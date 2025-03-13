/**
 * 消抖函数
 * @param func 
 * @param wait 
 * @returns 
 */
export function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
    let timeout: number;
    return function (this: any, ...args: any[]) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(this, args); // 保证 func 在正确的上下文中执行
        }, wait);
    } as T;
}

/**
 * 节流函数
 * @param func 
 * @param wait 
 * @returns 
 */
export function throttle<T extends (...args: any[]) => void>(func: T, wait: number): T {
    let lastTime = 0;
    return function (this: any, ...args: any[]) {
        const now = Date.now();
        if (now - lastTime >= wait) {
            lastTime = now;
            func.apply(this, args); // 保证 func 在正确的上下文中执行
        }
    } as T;
}
