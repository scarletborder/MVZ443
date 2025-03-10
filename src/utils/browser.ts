const getPublicUrl = () => {
    const path = window.location.pathname;
    // 假设你的 GitHub Pages 路径总是 `/MVZ443/`，可以通过正则判断
    return path.includes('/MVZ443/') ? '/MVZ443' : '';
}

export const publicUrl = getPublicUrl();

