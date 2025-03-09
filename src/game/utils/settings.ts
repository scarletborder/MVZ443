// 管理游戏内的settings

import { EventBus } from "../EventBus"

export default class InnerSettings {

    public isBluePrint: boolean

    constructor() {
        EventBus.on('send-game-settings', (data: { isBluePrint: boolean }) => {
            this.isBluePrint = data.isBluePrint;
        })
    }
    
}