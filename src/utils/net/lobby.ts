

// 处理连接到服务器大厅

import { publicUrl } from "../browser";
import BackendWS from "./sync";

export type RoomInfo = {
    room_id: string;
    need_key: boolean;
    player_count: number;
    game_started: boolean;
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
        if (BackendWS.isConnected) {
            alert("请先断开当前连接");
            return;
        }

        setTimeout(() => {
            BackendWS.setConnectionUrl(wsUrl);
            BackendWS.startConnection();
        }, 0); // 解决点击后立刻关闭的问题
    };

    return {
        title: `房间号: ${info.room_id} ${info.need_key ? "私密" : "公开"}`,
        description: `人数: ${info.player_count} ${info.game_started ? "游戏已开始" : "游戏未开始"}`,
        controlType: 'button',
        controlProps: {
            onClick: onClick,
        }
    }
}

export function createRoom(baseUrl: string, key: string) {
    if (BackendWS.isConnected) {
        alert("请先断开当前连接");
        return;
    }
    BackendWS.key = key; // 设置密钥
    const myKey = BackendWS.key;
    const wsUrl = `wss://${baseUrl}/ws?key=${myKey}`;
    BackendWS.setConnectionUrl(wsUrl);
    BackendWS.startConnection();
}