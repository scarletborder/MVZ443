import { publicUrl } from "./browser";

// i18n.ts
type Locale = "scarletborder" | "zh_CN" | "en_US"; // 支持的语言类型

interface I18n {
    locale: Locale;
    messages: Record<string, string>;
    set(locale: Locale): Promise<void>;
    translate(key: string): string;
    S(key: string): () => string;
    getLang(): string;
}

// 存储当前的 i18n 实例
let i18nInstance: I18n | null = null;

const i18n_tool: I18n = {
    locale: "scarletborder", // 默认语言,不能为任何Loacale中的一员
    messages: {},

    // 设置语言
    async set(locale: Locale) {
        if (i18nInstance?.locale === locale) return; // 如果当前语言已经是该语言，不需要重复加载
        this.locale = locale;
        const messages = await loadLocale(locale); // 动态加载语言包
        this.messages = messages;
    },

    // 获取翻译
    translate(key: string): string {
        return this.messages[key] || key; // 如果没有翻译，返回原始 key
    },

    // 工厂函数,创建一个返回 获取翻译 的函数
    S(key: string): () => string {
        const ret = () => {
            return this.translate(key);
        }
        return ret;
    },

    getLang(): string {
        return this.locale;
    }
};

// 动态加载语言文件
const loadLocale = async (locale: Locale): Promise<Record<string, string>> => {
    try {
        const messages = await import(`${publicUrl}/locales/${locale}.ts`); // 动态加载语言包
        return messages.default; // 返回语言文件中的默认对象
    } catch (error) {
        console.error(`语言加载失败: ${locale}, error`);
        return {}; // 如果加载失败，返回空对象
    }
};

// 全局初始化 i18n 实例
i18nInstance = i18n_tool;

// 将 i18n 作为方法暴露
const i18n = (key: string): string => {
    return i18nInstance ? i18nInstance.translate(key) : key; // 默认返回 key
};

i18n.set = i18n_tool.set.bind(i18n_tool); // 为方法绑定 set 功能

/**
 * 工厂函数,创建一个返回 获取翻译 的函数
 */
i18n.S = i18n_tool.S.bind(i18n_tool); // 为方法绑定 S 功能

i18n.getLang = i18n_tool.getLang.bind(i18n_tool); // 为方法绑定 getLang 功能

export default i18n;