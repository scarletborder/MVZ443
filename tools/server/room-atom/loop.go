package roomatom

// 状态机循环

import (
	"log"
	"mvzserver/constants"
	"mvzserver/messages"
	"sync/atomic"
	"time"

	"github.com/gofiber/websocket/v2"
)

// 房间开始
func (r *Room) Run() {
	defer func() {
		// 摧毁本房间
		r.Destroy()
	}()

	// 初始房间状态, 大厅中等待玩家
	r.GameStage = constants.STAGE_InLobby

	/* 状态机主循环
	根据用户输入和房间的当前状态来进行分支
	*/
	for {
		// 根据当前状态，决定是否需要 ticker
		var tickerChan (<-chan time.Time)

		// 如果不是 InGame状态，则不需要游戏逻辑定时器
		if r.GameStage == constants.STAGE_InGame && r.RoomCtx.GameTicker != nil {
			tickerChan = r.RoomCtx.GameTicker.C
		}

		select {
		// 1. 处理通用的客户端管理事件
		case player := <-r.register:
			r.handleRegister(player)

		case player := <-r.unregister:
			r.handleUnregister(player)

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

// 开始服务用户
func (room *Room) StartServeClient(ctx *ClientCtx) {
	// 基础信息
	conn := ctx.Conn

	// 只接受信息， 并把信息发送到管道中
beforeGame:
	for {
		messageType, data, err := conn.ReadMessage()
		if err != nil {
			log.Println("read error:", err)
			return
		}

		// 忽略非二进制消息
		if messageType != websocket.BinaryMessage {
			continue
		}

		msgType, decoded, err := messages.DecodeBinaryMessage(data)
		if err != nil {
			log.Println("decode error:", err)
			continue
		}

		switch msgType {
		case messages.MsgTypeRequestChooseMap:
			msg, ok := decoded.(messages.RequestChooseMap)
			if !ok {
				log.Println("decode error: invalid message type")
				continue
			}
			if clientCtx.Id == room.RoomCtx.OwnerUserID {
				atomic.StoreInt32(&room.ChapterID, int32(msg.ChapterId))
				room.RoomCtx.BroadcastRoomInfo(room.ChapterID, room.ID)
			}
		case messages.MsgTypeReady:
			atomic.AddInt32(&room.ReadyCount, 1)
			break beforeGame
		}
	}

	// 等待游戏开始
	<-clientCtx.startChan

	// 游戏主循环
	// 随时接收
	for {
		messageType, data, err := conn.ReadMessage()
		if err != nil {
			log.Println("read error:", err)
			return
		}

		// 忽略非二进制消息
		if messageType != websocket.BinaryMessage {
			continue
		}

		msgType, decoded, err := messages.DecodeBinaryMessage(data)
		if err != nil {
			log.Println("decode error:", err)
			continue
		}

		switch msgType {
		case messages.MsgTypeRequestBlank:
			// 只通过空白消息表示客户端接收到了服务端消息
			msg, ok := decoded.(messages.RequestBlank)
			if !ok {
				log.Println("decode error: invalid message type")
				continue
			}
			room.UpdatePlayerFrameID(msg.UID, msg.FrameID)
		case messages.MsgTypeRequestCardPlant:
			msg, ok := decoded.(messages.RequestCardPlant)
			if !ok {
				log.Println("decode error: invalid message type")
				continue
			}
			room.Logic.PlantCard(
				msg.Col,
				msg.Row,
				msg.Pid,
				msg.Level,
				clientCtx.Id,
				room.GetNextFrameID(),
			)
		case messages.MsgTypeRequestRemovePlant:
			msg, ok := decoded.(messages.RequestRemovePlant)
			if !ok {
				log.Println("decode error: invalid message type")
				continue
			}
			room.Logic.RemoveCard(
				msg.Col,
				msg.Row,
				msg.Pid,
				clientCtx.Id,
				room.GetNextFrameID(),
			)
		case messages.MsgTypeRequestStarShards:
			msg, ok := decoded.(messages.RequestStarShards)
			if !ok {
				log.Println("decode error: invalid message type")
				continue
			}
			room.Logic.UseStarShards(
				msg.Col,
				msg.Row,
				msg.Pid,
				clientCtx.Id,
				room.GetNextFrameID(),
			)
		case messages.MsgTypeRequestEndGame:
			msg, ok := decoded.(messages.RequestEndGame)
			if !ok {
				log.Println("decode error: invalid message type")
				continue
			}
			// 加急发送
			room.Logic.BroadGameEnd(room, msg.GameResult)

			// 未来10s内删除房间
			go func() {
				time.Sleep(10 * time.Second)
				room.IsRunning = true
				room.gameStarted = false
			}()
			return
		}
	}
}
