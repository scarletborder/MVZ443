package roomatom

// 房间的全局管理（如房间的创建、销毁、查找）

import (
	"math/rand"
	"mvzserver/constants"
	gamelogic "mvzserver/room-atom/game-logic"
	"time"
)

func NewRoom(id int) *Room {
	return &Room{
		ID:             id,
		RoomCtx:        NewRoomCtx(),
		Logic:          gamelogic.NewGameLogic(),
		ChapterID:      0,
		ReadyCount:     0,
		Seed:           rand.Int31n(40960000),
		FrameID:        0,
		LastActiveTime: time.Now(),
		key:            "",
		GameStage:      constants.STAGE_InLobby,
	}
}

func (r *Room) Destroy() {
	r.RoomCtx.CloseAll()
	// 通知房间关闭, 通过游戏状态来做
	r.GameStage = constants.STAGE_CLOSED
}

// 房间开始
func (r *Room) Run() {
	// 设置状态， 大厅中等待玩家
	r.GameStage = constants.STAGE_InLobby

	for {
		// 根据当前状态，决定是否需要 ticker
		var tickerChan (<-chan time.Time)

		// 如果不是 InGame状态，则不需要游戏逻辑定时器
		if r.GameStage == constants.STAGE_InGame && r.RoomCtx.GameTicker != nil {
			tickerChan = r.RoomCtx.GameTicker.C
		}

		select {
		// 1. 处理通用的客户端管理事件
		case client := <-r.register:
			// ... 注册客户端逻辑 ...
			// 在 Lobby 状态下才允许新玩家加入
			if r.currentState == StateLobby {
				r.addClient(client)
				// 广播人数变化
			} else {
				// 拒绝加入
			}

		case client := <-r.unregister:
			// ... 注销客户端逻辑 ...
			// 广播人数变化，如果状态是 Preparing/InGame，可能需要特殊处理

		// 2. 处理玩家发来的具体业务消息
		case message := <-r.incomingMessages: // 假设有一个 channel 接收所有玩家消息
			r.handlePlayerMessage(message)

		// 3. 处理定时器事件，仅在 InGame 状态下有效
		case <-tickerChan:
			r.runGameTick()

			// ... 其他 channel ...
		}
	}
}
