package roomatom

// 状态机循环

import (
	"log"
	"mvzserver/clients"
	"mvzserver/constants"
	"runtime/debug"
	"time"

	"github.com/gofiber/websocket/v2"
)

// 房间开始
func (room *Room) Run() {
	defer func() {
		if r := recover(); r != nil {
			// 发生了 panic，r 是 panic 的值
			log.Printf("运行房间 %d 捕获到 Panic: %v\n", room.ID, r)

			// 打印详细的堆栈信息，对于调试非常重要
			// debug.Stack() 返回格式化好的当前 goroutine 的堆栈跟踪
			log.Printf("堆栈信息:\n%s", string(debug.Stack()))

			// 在这里，你可以执行一些额外的清理工作，或者上报错误到监控系统
			log.Println("程序已从 panic 中恢复，将继续运行。")
		}
		// 摧毁本房间
		room.Destroy()
	}()

	// 初始房间状态, 大厅中等待玩家
	room.GameStage.Store(constants.STAGE_InLobby)

	/* 状态机主循环
	根据用户输入和房间的当前状态来进行分支
	*/
	for {
		// 根据当前状态，决定是否需要 ticker
		var tickerChan (<-chan time.Time)

		// 如果不是 InGame状态，则不需要游戏逻辑定时器
		if room.GameStage.EqualTo(constants.STAGE_InGame) && room.RoomCtx.GameTicker != nil {
			// 只有在 InGame 状态下才有 GameTicker
			tickerChan = room.RoomCtx.GameTicker.C
		}

		select {
		// 1. 处理通用的客户端管理事件
		case player := <-room.register:
			room.handleRegister(player)

		case player := <-room.unregister:
			room.handleUnregister(player)

		// 2. 处理玩家发来的具体业务消息
		// channel 接收所有玩家消息
		case message := <-room.incomingMessages: // channel 接收所有玩家消息
			room.handlePlayerMessage(message)

		// 3. 处理定时器事件，仅在 InGame 状态下有效
		case <-tickerChan:
			room.runGameTick()

			// ... 其他 channel ...
		}
	}
}

// 开始服务用户
func (room *Room) StartServeClient(player *clients.Player) {
	// 基础信息
	ctx := player.Ctx
	log.Printf("🟡 StartServeClient for player %d", player.GetID())

	// 检查基本有效性
	if ctx == nil {
		log.Printf("🔴 Player context is nil for player %d at start", player.GetID())
		return
	}

	log.Printf("🟢 Starting client service for player %d", player.GetID())

	defer func() {
		log.Printf("🟡 StartServeClient ending for player %d", player.GetID())

		// 发送 unregister 信号，通知房间移除这个玩家
		// 使用非阻塞发送
		select {
		case room.unregister <- player:
			log.Printf("🟡 Sent unregister signal for player %d", player.GetID())
		default:
			// 如果 channel 满了，说明房间可能正在关闭或有问题
			log.Printf("🔴 Failed to send unregister signal for player %d (channel full)", player.GetID())
			// 但我们仍然需要清理资源
			if player != nil && player.Ctx != nil {
				player.Ctx.Close()
			}
		}

		if r := recover(); r != nil {
			// 发生了 panic，r 是 panic 的值
			log.Printf("服务用户 %d 时捕获到 Panic: %v\n", player.GetID(), r)

			// 打印详细的堆栈信息，对于调试非常重要
			// debug.Stack() 返回格式化好的当前 goroutine 的堆栈跟踪
			log.Printf("堆栈信息:\n%s", string(debug.Stack()))

			// 在这里，你可以执行一些额外的清理工作，或者上报错误到监控系统
			log.Println("程序已从 panic 中恢复，将继续运行。")
		}
	}()

	// TODO： 加入短线重连机制,.具体见我和gemini对话
	// ...

	// 只接受信息， 并把信息发送到管道中
	log.Printf("🟡 Starting message loop for player %d", player.GetID())
	for {
		messageType, data, err := ctx.SafeReadMessage()
		if err != nil {
			log.Printf("🔴 ReadMessage error for player %d: %v", player.GetID(), err)

			// 分析不同类型的关闭错误
			if websocket.IsCloseError(err, websocket.CloseNoStatusReceived) {
				log.Printf("🔵 Player %d connection closed without status (likely browser refresh/close)", player.GetID())
			} else if websocket.IsCloseError(err, websocket.CloseGoingAway) {
				log.Printf("🔵 Player %d going away (page navigation/browser close)", player.GetID())
			} else if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
				log.Printf("🔵 Player %d normal closure", player.GetID())
			} else if websocket.IsCloseError(err, websocket.CloseAbnormalClosure) {
				log.Printf("🔵 Player %d abnormal closure", player.GetID())
			} else {
				// 其他类型的错误
				log.Printf("🔴 Non-close error for player %d: %v", player.GetID(), err)
			}

			// 读取错误，可能是连接关闭
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure, websocket.CloseNoStatusReceived) {
				log.Printf("🔵 Unexpected close error for player %d: %v", player.GetID(), err)
			}
			return
		}

		log.Printf("🟡 Received message from player %d, type: %d, length: %d", player.GetID(), messageType, len(data))

		// 忽略非二进制消息
		if messageType != websocket.BinaryMessage {
			continue
		}

		// 发送到管道中
		msg := clients.GetPlayerMessage(player, data)
		room.incomingMessages <- msg
	}
}

/*

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
*/
