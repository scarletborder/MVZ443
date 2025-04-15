import { useEffect, useState } from 'react';
import { VERSION, announcement } from '../../public/constants'
import LevelSelect from './menu/levelSelect';
import Pokedex from './menu/pokedex';
import Settings from './menu/settings';
import { GameParams } from '../game/models/GameParams';
import { publicUrl } from '../utils/browser';
import { useDeviceType } from '../hooks/useDeviceType';
import BackendWS from '../utils/net/sync';
import i18n from '../utils/i18n';
import Shop from './shop/shop';
import { useNavigate } from 'react-router-dom';

interface Props {
    width: number,
    height?: number,
    sceneRef: any,
    setGameParams: (gameParams: GameParams) => void,
    gameStart: () => void,
};

export default function DocFrame({ width, height, sceneRef, setGameParams, gameStart }: Props) {
    if (height === undefined) {
        height = width * 3 / 4;
    }

    // 状态管理
    const [currentView, setCurrentView] = useState('main'); // main, levels, pokedex, shop, export, updates, about
    const menuItems = [
        "主页",
        "选择关卡",
        "器械图鉴",
        "商店",
        "设置",
        "更新记录",
        "游戏文档",
        "关于"
    ];

    const [skipToParams, setSkipToParams] = useState(false);
    const [chosenStage, setChosenStage] = useState<number | null>(null);
    const [islord, setIslord] = useState(false);

    const [commitVersion, setCommitVersion] = useState('develop');
    const deviceType = useDeviceType();
    const navigate = useNavigate();

    useEffect(() => {
        // 处理联机事件
        const chapterJumpHandler = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.type === 0x00 && data.lordID !== data.myID) {
                // 跳转章节,直接到选卡界面
                const chapterID = data.chapterId;
                if (chapterID !== undefined && chapterID !== null && chapterID > 0) {
                    console.log('jump to chapter', chapterID);
                    setChosenStage(chapterID);
                    setSkipToParams(true);
                    setCurrentView('levels');
                }
                setIslord(false);
            } else if (data.type === 0x00 && data.lordID === data.myID) {
                console.log('i am load')
                setIslord(true);
            }

        }
        BackendWS.addMessageListener(chapterJumpHandler);
        return () => {
            BackendWS.delMessageListener(chapterJumpHandler);
        }
    }, []);

    useEffect(() => {
        // 读取版本文件
        const versionFile = `${publicUrl}/version.txt`;
        fetch(versionFile)
            .then(response => response.text())
            .then(data => {
                setCommitVersion(data.trim());
            })
            .catch(error => {
                console.error('获取版本信息失败:', error);
            });
    }, []);


    const aboutContent = `
        MC VS Zombie 443

        作者：scarletborder
        版本：V${VERSION} - COMMIT ${commitVersion}

        联系方式：baishuibeef@gmail.com
        bilibili: https://space.bilibili.com/123796349

        材质来源: Minecraft VS Zombie2 GMS2版
        原作者:  Cuerzor58 

        以下是公益服务器地址可以填进服务器地址输入框
        山东枣庄 103.228.12.180:49870
        美国洛杉矶 scarletborder.cn
    `;

    // 主菜单组件
    const MainMenu = () => (
        <div style={{
            width: `${width}px`,
            height: `${height}px`,
            minHeight: `${height}px`,
            minWidth: `${width}px`,
            backgroundImage: `url("${publicUrl}/assets/intro.jpg")`,

            backgroundRepeat: 'no-repeat',
            position: "relative",
            overflow: "hidden",
            border: "2px solid #444",
            boxShadow: "0 0 15px rgba(0, 0, 0, 0.5)",
            animation: "frameFadeIn 0.5s ease-out"
        }}>
            {/* 左侧菜单栏 */}
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
                {menuItems.map((item, index) => (
                    <button
                        key={index}
                        style={{
                            width: "100%",
                            padding: '4vh 20px',
                            maxHeight: deviceType === 'mobile' ? '15vh' : '5vh',
                            background: "none",
                            border: "none",
                            color: "#ddd",
                            textAlign: "center",
                            cursor: "pointer",
                            fontSize: "16px",
                            transition: "all 0.3s ease",
                            position: "relative",
                            margin: "5px 0",
                            boxShadow: "inset 0 0 0 2px rgba(100, 100, 100, 0.3)",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center"
                        }}
                        onMouseOver={(e) => {
                            const target = e.currentTarget;
                            target.style.background = "rgba(255, 255, 255, 0.1)";
                            target.style.boxShadow = "inset 0 0 0 2px #00ccff, 0 0 8px rgba(0, 204, 255, 0.5)";
                            target.style.color = "#fff";
                        }}
                        onMouseOut={(e) => {
                            const target = e.currentTarget;
                            target.style.background = "none";
                            target.style.boxShadow = "inset 0 0 0 2px rgba(100, 100, 100, 0.3)";
                            target.style.color = "#ddd";
                        }}
                        onClick={() => {
                            if (item === "选择关卡") setCurrentView('levels');
                            else if (item === "器械图鉴") setCurrentView('pokedex');
                            else if (item === "商店") setCurrentView('shop');
                            else if (item === "更新记录") {
                                // 跳转
                                navigate(`${publicUrl}/updates`);
                            }
                            else if (item === "设置") {
                                navigate(`${publicUrl}/settings`);
                            }
                            else if (item === "关于") setCurrentView('about');
                            else if (item === "游戏文档") {
                                navigate(`${publicUrl}/docs`);
                            }
                            else if (item === "主页") setCurrentView('main')
                        }}
                    >
                        <span style={{
                            position: "absolute",
                            top: "-4px",
                            left: "-4px",
                            width: "8px",
                            height: "8px",
                            borderTop: "2px solid #888",
                            borderLeft: "2px solid #888",
                            opacity: 0.7
                        }}></span>
                        <span style={{
                            position: "absolute",
                            bottom: "-4px",
                            right: "-4px",
                            width: "8px",
                            height: "8px",
                            borderBottom: "2px solid #888",
                            borderRight: "2px solid #888",
                            opacity: 0.7
                        }}></span>
                        {item}
                    </button>
                ))}
            </div>

            {/* 右侧内容区域 */}
            <div style={{
                width: "75%",
                height: "100%",
                position: "absolute",
                background: "rgba(20, 20, 20, 0.35)",
                right: 0,
                top: 0,
            }}>
                {currentView === 'main' && (
                    <>
                        <div style={{
                            width: "100%",
                            textAlign: "center",
                            padding: "20px 0",
                            color: "#fff",
                            fontSize: "32px",
                            fontWeight: "bold",
                            textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)"
                        }}>
                            MC VS Zombie 443
                        </div>
                        <div style={{
                            position: 'absolute',
                            width: "96%",
                            margin: '2% 2%',
                            color: "#fff",
                            fontSize: "20px",
                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                            textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
                            whiteSpace: "pre-wrap"
                        }}>
                            {announcement}
                        </div>
                        <div style={{
                            position: "absolute",
                            bottom: "10px",
                            left: "10px",
                            color: "#fff",
                            fontSize: "12px"
                        }}>
                            © 2025 scarletborder.cn
                        </div>
                        <div style={{
                            position: "absolute",
                            bottom: "10px",
                            right: "10px",
                            color: "#888",
                            fontSize: "12px"
                        }}>
                            版本: v{VERSION} - COMMIT {commitVersion}
                        </div>
                    </>
                )}
                {(currentView === 'about') && (
                    <div style={{
                        width: "100%",
                        height: "95%",
                        padding: "20px",
                        background: "rgba(20, 20, 20, 0.35)",
                        color: "#ddd",
                        overflowY: "auto",
                        scrollbarWidth: "thin",
                        scrollbarColor: "#666 #333",
                        whiteSpace: "pre-wrap",// 保留换行和空格
                        WebkitUserSelect: "text", // 针对Chrome/Safari
                        MozUserSelect: "text", // 针对Firefox
                        msUserSelect: "text", // 针对IE10及以上
                        userSelect: "text", // 标准属性
                    }}>
                        {aboutContent}
                    </div>
                )}
            </div>
        </div>
    );

    // 根据当前视图渲染不同内容
    return (
        <>
            {currentView === 'main' || currentView === 'about' ? <MainMenu /> : null}
            {currentView === 'levels' && <LevelSelect width={width} height={height} onBack={() => setCurrentView('main')}
                startGame={gameStart} setGameParams={setGameParams} skipToParams={skipToParams} chosenStage={chosenStage}
            />}
            {currentView === 'pokedex' && <Pokedex sceneRef={sceneRef} width={width} height={height} onBack={() => setCurrentView('main')} />}
            {currentView === 'shop' && <Shop width={width} height={height} onBack={() => setCurrentView('main')} />}
            {currentView === 'settings' && <Settings width={width} height={height} onBack={() => setCurrentView('main')} />}

            <style>
                {`
                    @keyframes frameFadeIn {
                        from {
                            opacity: 0;
                            transform: scale(0.98);
                        }
                        to {
                            opacity: 1;
                            transform: scale(1);
                        }
                    }
                    
                    @keyframes frameFadeOut {
                        from {
                            opacity: 1;
                            transform: scale(1);
                        }
                        to {
                            opacity: 0;
                            transform: scale(0.98);
                        }
                    }
                `}
            </style>
        </>
    );
}
