// Boyer-Moore 算法实现（简单版）
export const boyerMooreSearch = (text: string, pattern: string): boolean => {
    if (pattern === '') {
        return true; // 如果模式串为空，返回 false
    }

    const m = pattern.length;
    const n = text.length;

    // 如果模式串的长度大于文本串，直接返回 false
    if (m > n) {
        return false;
    }

    // 1. 构建坏字符规则的“跳跃表”
    const badCharShift: { [key: string]: number } = {};
    for (let i = 0; i < m; i++) {
        badCharShift[pattern[i]] = i;
    }

    // 2. 从右到左匹配文本串
    let i = m - 1; // 从文本串的末尾开始
    while (i < n) {
        let j = m - 1; // 从模式串的末尾开始
        // 比较模式串和文本串中的字符
        while (j >= 0 && pattern[j] === text[i - (m - 1 - j)]) {
            j--;
        }

        // 如果找到匹配的模式串
        if (j === -1) {
            return true;
        }

        // 根据坏字符规则确定模式串的跳跃长度
        const shift = badCharShift[text[i]] !== undefined ? badCharShift[text[i]] : -1;
        i += Math.max(1, j - shift); // 跳跃
    }

    // 如果未找到匹配的模式串
    return false;
};
