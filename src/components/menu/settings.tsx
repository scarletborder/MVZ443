// Settings.tsx
import { useState, useRef, useEffect } from 'react';
import { useSaveManager } from '../../context/save_ctx';
import { useSettings } from '../../context/settings_ctx';
import { debounce } from '../../utils/debounce';
import i18n from '../../utils/i18n';
// import BackendWS from '../../utils/net/entry_ws';
import BackendWS from '../../utils/net/sync';
// import wtClient from '../../utils/net/sync';

interface Props {
    width: number;
    height?: number;
    onBack: () => void;
}

interface SettingItem {
    title: string;
    description: string;
    controlType: 'button' | 'switcher' | 'input' | 'selections';
    controlProps?: {
        onClick?: () => void; // for button
        value?: boolean; // for switcher
        onToggle?: (value: boolean) => void; // for switcher
        placeholder?: string; // for input
        onChange?: (value: string) => void; // for input
        options?: string[]; // for selections
        selected?: string; // for selections
        onSelect?: (value: string) => void; // for selections
    };
}

interface SettingPanel {
    title: string;
    items: SettingItem[];
}

export default function Settings({ width, height, onBack: onBackOriginal }: Props) {
    if (height === undefined) {
        height = width * 3 / 4;
    }

    const settingManager = useSettings();

    const [selectedCategory, setSelectedCategory] = useState('general');
    const [displayLanguage, setDisplayLanguage] = useState(i18n.getLang());
    const [isFullscreen, setIsFullscreen] = useState(document.fullscreenElement !== null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const saveManager = useSaveManager();
    const [isConnected, setIsConnected] = useState(BackendWS.isConnected);

    const onBack = () => {
        onBackOriginal();
        saveManager.saveProgress();
    };

    useEffect(() => {
        setDisplayLanguage(i18n.getLang());
    }, [i18n.getLang]);


    // 处理导入存档
    const handleImportSave = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type === 'application/json') {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                saveManager.importSave(content)
                console.log('导入存档:', content);
            };
            reader.readAsText(file);
        } else {
            alert('请上传有效的 JSON 文件');
        }
        // 重置 input 以允许重复选择同一文件
        event.target.value = '';
    };

    // 处理导出存档
    const handleExportSave = () => {
        saveManager.exportSave((jsonString: string) => {
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `save_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });

    };


    // 设置类别和对应的面板数据
    const settingsData: { [key: string]: (SettingPanel | null)[] } = {
        general: [
            {
                title: "显示",
                items: [
                    {
                        title: "全屏模式",
                        description: "切换全屏显示",
                        controlType: "switcher",
                        controlProps: {
                            value: isFullscreen, onToggle: (val) => {
                                if (!document.fullscreenElement) {
                                    document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
                                } else {
                                    document.exitFullscreen().then(() => setIsFullscreen(false));
                                }
                            }
                        }
                    },
                    {
                        title: "切换分辨率",
                        description: "选择游戏分辨率,移动端推荐选择画面缩小50%并选用924x693",
                        controlType: "selections",
                        controlProps: {
                            options: ["800x600", "924x693", "1024x768", "1200x900", "1600x1200", "600x450"], selected: `${width}x${width / 4 * 3}`, onSelect: (val) => {
                                let twidth = parseInt(val);
                                settingManager.setWidth(twidth);
                            }
                        }
                    },
                    {
                        title: "语言",
                        description: "选择游戏语言, only pokedx currently",
                        controlType: "selections",
                        controlProps: {
                            options: ["zh_CN", "en_US"], selected: displayLanguage, onSelect: (val) => {
                                i18n.set(val);
                                setDisplayLanguage(val);
                            }
                        }
                    },
                    {
                        title: "显示调试信息",
                        description: "开启/关闭调试信息显示",
                        controlType: "switcher",
                        controlProps: {
                            value: settingManager.isDebug, onToggle: (val) => {
                                console.log(val);
                                debounce((newVal) => settingManager.setIsDebug(newVal), 50)(val);
                            }
                        }
                    }
                ],
            },
            {
                title: "存档管理",
                items: [
                    {
                        title: "保存进度",
                        description: "手动保存当前游戏进度",
                        controlType: "button",
                        controlProps: {
                            onClick: () => {
                                saveManager.saveProgress();
                            }
                        }
                    },
                    {
                        title: "导入存档",
                        description: "从本地上传 JSON 存档文件",
                        controlType: "button",
                        controlProps: { onClick: handleImportSave }
                    },
                    {
                        title: "导出存档",
                        description: "将当前存档下载为 JSON 文件",
                        controlType: "button",
                        controlProps: { onClick: handleExportSave }
                    }
                ]
            }
        ], game: [
            {
                title: "游戏设置",
                items: [
                    {
                        title: "私密图纸模式",
                        description: "启用后可以在暂停状态中放置和移除器械",
                        controlType: "switcher",
                        controlProps: {
                            value: settingManager.isBluePrint, onToggle: (val) => {
                                console.log(val);
                                debounce((newVal) => settingManager.setIsBluePrint(newVal), 50)(val);
                            }
                        }
                    },
                ]
            }
        ],
        online: [
            {
                title: "联机设置",
                items: [
                    {
                        title: "服务器地址",
                        description: "输入服务器地址",
                        controlType: "input",
                        controlProps: {
                            placeholder: BackendWS.url, onChange: (val) => {
                                debounce((newVal) => {
                                    BackendWS.setConnectionUrl(newVal);
                                }, 50)(val);
                            }
                        }
                    },
                    {
                        title: "连接",
                        description: `连接服务器`,
                        controlType: "button",
                        controlProps: {
                            onClick: () => {
                                BackendWS.startConnection();
                                setIsConnected(BackendWS.isConnected);
                            }
                        }
                    },
                    {
                        title: "断开",
                        description: "断开服务器连接",
                        controlType: "button",
                        controlProps: {
                            onClick: () => {
                                BackendWS.closeConnection();
                                setIsConnected(BackendWS.isConnected);
                            }
                        }
                    }
                ]
            }
        ]
    };

    const menuItems = [
        { name: "通用", key: "general" },
        { name: "游戏性", key: "game" },
        { name: "联机", key: "online" }
    ];
    return (
        <div style={{
            width: `${width}px`,
            height: `${height}px`,
            background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
            position: "relative",
            overflow: "hidden",
            border: "2px solid #444",
            boxShadow: "0 0 15px rgba(0, 0, 0, 0.5)",
            animation: "frameFadeIn 0.5s ease-out"
        }}>
            {/* 左侧30% - 菜单栏 */}
            <div style={{
                width: "25%",
                height: "100%",
                position: "absolute",
                left: 0,
                top: 0,
                background: "rgba(20, 20, 20, 0.85)",
                backdropFilter: "blur(5px)",
                overflowY: "auto",
                overflowX: 'hidden',
                scrollbarWidth: "thin",
                scrollbarColor: "#666 #333",
                borderRight: "1px solid rgba(100, 100, 100, 0.3)"
            }}>
                <button
                    className='backbutton'
                    style={{
                        background: "none",
                        border: "none",
                        color: "#ddd",
                        textAlign: "center",
                        cursor: "pointer",
                        fontSize: "16px",
                        transition: "all 0.3s ease",
                        position: "relative",
                        margin: "5px 0",
                        boxShadow: "inset 0 0 0 2px rgba(100, 100, 100, 0.3)"
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                        e.currentTarget.style.boxShadow = "inset 0 0 0 2px #00ccff, 0 0 8px rgba(0, 204, 255, 0.5)";
                        e.currentTarget.style.color = "#fff";
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = "none";
                        e.currentTarget.style.boxShadow = "inset 0 0 0 2px rgba(100, 100, 100, 0.3)";
                        e.currentTarget.style.color = "#ddd";
                    }}
                    onClick={onBack}
                >
                    返回
                </button>
                {menuItems.map((item) => (
                    <button
                        key={item.key}
                        className='menubutton'
                        style={{
                            background: selectedCategory === item.key ? "rgba(255, 255, 255, 0.1)" : "none",
                            boxShadow: selectedCategory === item.key
                                ? "inset 0 0 0 2px #00ccff, 0 0 8px rgba(0, 204, 255, 0.5)"
                                : "inset 0 0 0 2px rgba(100, 100, 100, 0.3)"
                        }}
                        onMouseOver={(e) => {
                            if (selectedCategory !== item.key) {
                                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                                e.currentTarget.style.boxShadow = "inset 0 0 0 2px #00ccff, 0 0 8px rgba(0, 204, 255, 0.5)";
                                e.currentTarget.style.color = "#fff";
                            }
                        }}
                        onMouseOut={(e) => {
                            if (selectedCategory !== item.key) {
                                e.currentTarget.style.background = "none";
                                e.currentTarget.style.boxShadow = "inset 0 0 0 2px rgba(100, 100, 100, 0.3)";
                                e.currentTarget.style.color = "#ddd";
                            }
                        }}
                        onClick={() => setSelectedCategory(item.key)}
                    >
                        {item.name}
                    </button>
                ))}
            </div>

            {/* 右侧70% - 设置页面 */}
            <div style={{
                width: "70%",
                height: "100%",
                position: "absolute",
                right: 0,
                top: 0,
                padding: "20px",
                color: "#ddd",
                overflowY: "auto",
                scrollbarWidth: "thin",
                scrollbarColor: "#666 #333",
                background: "rgba(30, 30, 30, 0.9)"
            }}>
                {settingsData[selectedCategory].filter(panel => panel !== null).map((panel, index) => (
                    <div key={index} style={{
                        marginBottom: "30px",
                        border: "1px solid rgba(100, 100, 100, 0.5)",
                        padding: "15px",
                        borderRadius: "5px"
                    }}>
                        <h3 style={{ marginBottom: "15px", color: "#fff" }}>{panel.title}</h3>
                        {panel.items.map((item, idx) => (
                            <div key={idx} style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "10px 0",
                                borderBottom: idx < panel.items.length - 1 ? "1px solid rgba(100, 100, 100, 0.3)" : "none"
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: "16px", color: "#fff" }}>{item.title}</div>
                                    <div style={{ fontSize: "12px", color: "#aaa" }}>{item.description}</div>
                                </div>
                                <div style={{ width: "200px", textAlign: "right" }}>
                                    {item.controlType === 'button' && (
                                        <button
                                            style={{
                                                padding: "5px 15px",
                                                background: "none",
                                                border: "1px solid #666",
                                                color: "#ddd",
                                                cursor: "pointer",
                                                transition: "all 0.3s ease"
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                                                e.currentTarget.style.borderColor = "#00ccff";
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.background = "none";
                                                e.currentTarget.style.borderColor = "#666";
                                            }}
                                            onClick={item.controlProps?.onClick}
                                        >
                                            执行
                                        </button>
                                    )}
                                    {item.controlType === 'switcher' && (
                                        <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <input
                                                type="checkbox"
                                                checked={item.controlProps?.value}
                                                onChange={(e) => item.controlProps?.onToggle?.(e.target.checked)}
                                                style={{ display: "none" }}
                                            />
                                            <div style={{
                                                width: "40px",
                                                height: "20px",
                                                background: item.controlProps?.value ? "#00ccff" : "#666",
                                                borderRadius: "10px",
                                                position: "relative",
                                                cursor: "pointer",
                                                transition: "background 0.3s ease"
                                            }}
                                                onClick={() => item.controlProps?.onToggle?.(!item.controlProps?.value)}>
                                                <div style={{
                                                    width: "16px",
                                                    height: "16px",
                                                    background: "#fff",
                                                    borderRadius: "50%",
                                                    position: "absolute",
                                                    top: "2px",
                                                    left: item.controlProps?.value ? "22px" : "2px",
                                                    transition: "left 0.3s ease"
                                                }}></div>
                                            </div>
                                        </label>
                                    )}
                                    {item.controlType === 'input' && (
                                        <input
                                            type="text"
                                            placeholder={item.controlProps?.placeholder}
                                            onChange={(e) => item.controlProps?.onChange?.(e.target.value)}
                                            style={{
                                                padding: "5px",
                                                background: "rgba(255, 255, 255, 0.1)",
                                                border: "1px solid #666",
                                                color: "#ddd",
                                                width: "100%",
                                                borderRadius: "3px"
                                            }}
                                        />
                                    )}
                                    {item.controlType === 'selections' && (
                                        <select
                                            value={item.controlProps?.selected}
                                            onChange={(e) => item.controlProps?.onSelect?.(e.target.value)}
                                            style={{
                                                padding: "5px",
                                                background: "rgba(255, 255, 255, 0.1)",
                                                border: "1px solid #666",
                                                color: "#ddd",
                                                width: "100%",
                                                borderRadius: "3px"
                                            }}
                                        >
                                            {item.controlProps?.options?.map((option) => (
                                                <option key={option} value={option} style={{ background: "#333", color: "#ddd" }}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
                {/* 隐藏的文件输入框 */}
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".json"
                    onChange={handleFileChange}
                />
            </div>

            <style>
                {`
    @keyframes frameFadeIn {
                        from { opacity: 0; transform: scale(0.95); }
                        to { opacity: 1; transform: scale(1); }
    }
    `}
            </style>
        </div>
    );
}
