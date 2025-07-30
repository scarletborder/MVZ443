package roomatom

// 状态机循环

import (
	"log"
	"mvzserver/messages"
	"sync/atomic"
	"time"

	"github.com/gofiber/websocket/v2"
)

/* 状态机主循环
根据用户输入和房间的当前状态来进行分支
*/

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
			if clientCtx.Id == room.RoomCtx.FirstUser {
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
