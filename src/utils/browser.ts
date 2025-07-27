const getPublicUrl = () => {
    const path = window.location.pathname;
    // 假设你的 GitHub Pages 路径总是 `/MVZ443/`，可以通过正则判断
    if (path.includes('/MVZ443')) {
        return '/MVZ443';
    } else if (path.includes('/mvz443')) {
        return '/mvz443';
    } else {
        return '';
    }
}

export const publicUrl = getPublicUrl();

