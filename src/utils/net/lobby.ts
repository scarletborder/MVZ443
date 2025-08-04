// 处理连接到服务器大厅

import { publicUrl } from "../browser";
import BackendWS from "./sync";

/**
 * RoomID      int             `json:"room_id"`
    NeedKey     bool            `json:"need_key"`
    PlayerCount int             `json:"player_count"`
    GameState   constants.Stage `json:"game_state"` // 游戏状态
 */
export type RoomInfo = {
    room_id: number;
    need_key: boolean;
    player_count: number;
    game_state: number;
}

// game_state to string
export function gameStateToString(state: number): string {
    switch (state) {
        case 0x20:
            return "大厅/等待中";
        case 0x21:
            return "准备中";
        case 0x22:
            return "加载中";
        case 0x23:
            return "游戏中";
        case 0x24:
            return "游戏后结算";
        case 0xEE:
            return "房间已关闭";
        case 0xFF:
            return "发生错误";
        default:
            return "未知状态";
    }
}

export function getRoomsInfo(lobbyUrl: string): Promise<RoomInfo[] | null> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", `https://${lobbyUrl}/list`, true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onreadystatechange = () => {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response || null);
                    } catch (error) {
                        console.error("Error parsing response:", error);
                        resolve(null);
                    }
                } else {
                    console.error("Error fetching rooms:", xhr.status, xhr.statusText);
                    resolve(null);
                }
            }
        };
        xhr.send();
    });
}

export function RoomListWidget(info: RoomInfo, baseUrl: string, key: string, setHeader: (arg0: string) => void): any {
    BackendWS.key = key; // 设置密钥
    const myKey = BackendWS.key;
    const wsUrl = `wss://${baseUrl}/ws?id=${info.room_id}&key=${myKey}`;

    const onClick = () => {
        if (BackendWS.isOnlineMode()) {
            alert("请先断开当前连接");
            return;
        }

        setTimeout(() => {
            BackendWS.setConnectionUrl(wsUrl);
            BackendWS.startConnection();
        }, 0); // 解决点击后立刻关闭的问题
    };

    return {
        titleKey: `房间号: ${info.room_id} ${info.need_key ? "私密" : "公开"}`,
        descriptionKey: `人数: ${info.player_count} ${gameStateToString(info.game_state)}`,
        controlType: 'button',
        controlProps: {
            onClick: onClick,
        }
    }
}

export function createRoom(baseUrl: string, key: string) {
    if (BackendWS.isOnlineMode()) {
        alert("请先断开当前连接");
        return;
    }
    BackendWS.key = key; // 设置密钥
    const myKey = BackendWS.key;
    const wsUrl = `wss://${baseUrl}/ws?key=${myKey}`;
    BackendWS.setConnectionUrl(wsUrl);
    BackendWS.startConnection();
} 