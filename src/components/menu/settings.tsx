// Settings.tsx
import { useState, useRef, useEffect } from 'react';
import { useSaveManager } from '../../context/save_ctx';
import { useSettings } from '../../context/settings_ctx';
import { debounce } from '../../utils/debounce';
import BackendWS from '../../utils/net/sync';
import { createRoom, getRoomsInfo, RoomInfo, RoomListWidget } from '../../utils/net/lobby';
import { Locale, useLocaleMessages } from '../../hooks/useLocaleMessages';

interface Props {
    width: number;
    height?: number;
    onBack: () => void;
}

interface SettingItem {
    titleKey: string;
    descriptionKey: string;
    controlType: 'button' | 'switcher' | 'input' | 'selections';
    controlProps?: {
        onClick?: () => void; // for button
        btnText?: string; // for button

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
    const [isFullscreen, setIsFullscreen] = useState(document.fullscreenElement !== null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const saveManager = useSaveManager();

    const [header, setHeader] = useState<string>("");
    const [roomsInfo, setRoomsInfo] = useState<RoomInfo[]>([]);
    const [noRoomFlag, setNoRoomFlag] = useState(false);

    const [linkStatus, setLinkStatus] = useState(false);
    const { translate } = useLocaleMessages();

    useEffect(() => {
        const interval = setInterval(() => {
            setLinkStatus(BackendWS.isConnected);
        }, 500);

        return () => clearInterval(interval);
    }, []);

    const onBack = () => {
        onBackOriginal();
        saveManager.saveProgress();
    };

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
                saveManager.importSave(content);
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
                title: "menu_settings_general_display",
                items: [
                    {
                        titleKey: "menu_settings_general_fullscreen",
                        descriptionKey: "menu_settings_general_fullscreen_t",
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
                        titleKey: "menu_settings_general_resolution",
                        descriptionKey: "menu_settings_general_resolution_t",
                        controlType: "selections",
                        controlProps: {
                            options: ["800x600", "924x693", "1024x768", "1200x900"], selected: `${width}x${width / 4 * 3}`, onSelect: (val) => {
                                let twidth = parseInt(val);
                                settingManager.setWidth(twidth);
                            }
                        }
                    },
                    {
                        titleKey: "menu_settings_general_language",
                        descriptionKey: "menu_settings_general_language_t",
                        controlType: "selections",
                        controlProps: {
                            options: ["zh_CN", "en_US"], selected: settingManager.language, onSelect: (val) => {
                                if (!val) {
                                    return;
                                }
                                settingManager.toggleLanguage(val as Locale);
                            }
                        }
                    },
                    {
                        titleKey: "menu_settings_general_debug",
                        descriptionKey: "menu_settings_general_debug_t",
                        controlType: "switcher",
                        controlProps: {
                            value: settingManager.isDebug, onToggle: (val) => {
                                debounce((newVal) => settingManager.setIsDebug(newVal), 50)(val);
                            }
                        }
                    }
                ],
            },
            {
                title: "menu_settings_general_saves",
                items: [
                    {
                        titleKey: "menu_settings_general_save_progress",
                        descriptionKey: "menu_settings_general_save_progress_t",
                        controlType: "button",
                        controlProps: {
                            onClick: () => {
                                saveManager.saveProgress();
                            },
                            btnText: "menu_settings_save"
                        }
                    },
                    {
                        titleKey: "menu_settings_general_import_save",
                        descriptionKey: "menu_settings_general_import_save_t",
                        controlType: "button",
                        controlProps: { onClick: handleImportSave, btnText: "menu_settings_import" }
                    },
                    {
                        titleKey: "menu_settings_general_export_save",
                        descriptionKey: "menu_settings_general_export_save_t",
                        controlType: "button",
                        controlProps: { onClick: handleExportSave, btnText: "menu_settings_export" }
                    }
                ]
            }
        ], game: [
            {
                title: "menu_settings_gaming_gamesettings",
                items: [
                    {
                        titleKey: "menu_settings_gaming_private_blueprints",
                        descriptionKey: "menu_settings_gaming_private_blueprints_t",
                        controlType: "switcher",
                        controlProps: {
                            value: settingManager.isBluePrint, onToggle: (val) => {
                                debounce((newVal) => settingManager.setIsBluePrint(newVal), 50)(val);
                            }
                        }
                    },
                    {
                        titleKey: "menu_settings_gaming_background_music",
                        descriptionKey: "menu_settings_gaming_background_music_t",
                        controlType: "switcher",
                        controlProps: {
                            value: settingManager.isBgm, onToggle: (val) => {
                                debounce((newVal) => settingManager.setIsBgm(newVal), 50)(val);
                            }
                        }
                    },
                    {
                        titleKey: "menu_settings_gaming_sound_effects",
                        descriptionKey: "menu_settings_gaming_sound_effects_t",
                        controlType: "switcher",
                        controlProps: {
                            value: settingManager.isSoundAudio, onToggle: (val) => {
                                debounce((newVal) => settingManager.setIsSoundAudio(newVal), 50)(val);
                            }
                        }
                    }
                ]
            }
        ],
        online: [
            {
                title: `Online Settings${linkStatus ? `-Connected->id: ${BackendWS.room_id}` : "-Disconnected"}`,
                items: [
                    {
                        titleKey: "menu_settings_server_address",
                        descriptionKey: "menu_settings_server_address_t",
                        controlType: "input",
                        controlProps: {
                            placeholder: settingManager.linkOptions.baseUrl, onChange: (val) => {
                                if (!val) {
                                    settingManager.setLinkOptions("", settingManager.linkOptions.key);
                                    return;
                                }
                                settingManager.setLinkOptions(val, settingManager.linkOptions.key);
                            }
                        }
                    },
                    {
                        titleKey: 'menu_settings_try_connectivity',
                        descriptionKey: 'menu_settings_try_connectivity_t',
                        controlType: 'button',
                        controlProps: {
                            onClick: () => {
                                function checkAndOpenUrl(url: string) {
                                    // 发起一个 fetch 请求来检测证书
                                    fetch(url, { method: 'HEAD' })
                                        .then(response => {
                                            // 如果响应成功，不是自签证书
                                            alert('有效并且证书已被信任');
                                        })
                                        .catch(error => {
                                            if (error instanceof TypeError) {
                                                // 这里的 TypeError 通常表示网络问题或证书错误
                                                console.error('Network error or SSL certificate issue', error);
                                                // 引导用户手动信任自签名证书
                                                alert("目标服务器证书没有被信任,现在开始手动信任流程,浏览器会提示您的连接不是私密连接”，点击'高级' 继续前往（不安全)这样浏览器会把该证书加入“例外”列表。");

                                                // window.open(url, '_blank');
                                                const newTab = window.open('', '_blank');
                                                if (newTab) {
                                                    newTab.location.href = url;
                                                }
                                            } else {
                                                // 处理其他类型的错误
                                                console.error('An error occurred:', error);
                                                alert(`其他错误 ${error}`);
                                            }
                                        });
                                }
                                checkAndOpenUrl(`https://${settingManager.linkOptions.baseUrl}/list`);
                            },
                            btnText: 'menu_settings_try_connectivity',
                        }
                    },
                    {
                        titleKey: "menu_settings_refresh_room_list",
                        descriptionKey: "menu_settings_refresh_room_list_t",
                        controlType: "button",
                        controlProps: {
                            onClick: () => {
                                setNoRoomFlag(false);
                                setRoomsInfo([]);
                                debounce(() => {
                                    const req = async () => {
                                        const roomsInfo = await getRoomsInfo(settingManager.linkOptions.baseUrl);
                                        if (roomsInfo === null) {
                                            alert("获取房间列表失败，请检查服务器地址或网络连接, 或者尝试测试联通性。");
                                            return;
                                        }
                                        if (roomsInfo.length === 0) {
                                            setNoRoomFlag(true);
                                            return;
                                        }
                                        setRoomsInfo(roomsInfo);
                                    };
                                    req();
                                }, 50)();
                            },
                            btnText: "menu_settings_refresh_room_list"
                        }
                    },
                    {
                        titleKey: "menu_settings_create_room",
                        descriptionKey: "menu_settings_create_room_t",
                        controlType: "button",
                        controlProps: {
                            onClick: () => {
                                createRoom(settingManager.linkOptions.baseUrl, settingManager.linkOptions.key);
                            },
                            btnText: "menu_settings_create_room"
                        }
                    },
                    {
                        titleKey: "menu_settings_set_global_key",
                        descriptionKey: "menu_settings_set_global_key_t",
                        controlType: "input",
                        controlProps: {
                            placeholder: settingManager.linkOptions.key, onChange: (val) => {
                                console.log(val)
                                if (!val) {
                                    settingManager.setLinkOptions(settingManager.linkOptions.baseUrl, "");
                                }
                                settingManager.setLinkOptions(settingManager.linkOptions.baseUrl, val);
                            }
                        }
                    },
                    {
                        titleKey: "menu_settings_disconnect",
                        descriptionKey: "menu_settings_disconnect_t",
                        controlType: "button",
                        controlProps: {
                            onClick: () => {
                                BackendWS.closeConnection();
                            }
                        }
                    }
                ]
            },
            (roomsInfo.length > 0) ? {
                title: "房间列表",
                items: (
                    roomsInfo.map((info) => {
                        return RoomListWidget(info, settingManager.linkOptions.baseUrl, settingManager.linkOptions.key, setHeader);
                    })
                )
            } : null,
            (noRoomFlag) ? {
                title: "房间列表",
                items: [
                    {
                        titleKey: "没有房间",
                        descriptionKey: "当前没有可用的房间",
                    }
                ]
            } : null,
        ]
    };

    const menuItems = [
        { name: "menu_settings_general", key: "general" },
        { name: "menu_settings_gaming", key: "game" },
        { name: "menu_settings_online", key: "online" }
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
            {/* Left menu */}
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
                    {translate("menu_back")}
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
                        {translate(item.name)}
                    </button>
                ))}
            </div>

            {/* Right settings page */}
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
                        <h3 style={{ marginBottom: "15px", color: "#fff" }}>{translate(panel.title)}</h3>
                        {panel.items.map((item, idx) => (
                            <div key={idx} style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "10px 0",
                                borderBottom: idx < panel.items.length - 1 ? "1px solid rgba(100, 100, 100, 0.3)" : "none"
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: "16px", color: "#fff" }}>{translate(item.titleKey)}</div>
                                    <div style={{ fontSize: "12px", color: "#aaa" }}>{translate(item.descriptionKey)}</div>
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
                                            {translate(item.controlProps?.btnText!) || "执行"}
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
