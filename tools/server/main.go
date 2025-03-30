package main

import (
	"log"
	"mvzserver/messages"
	"strconv"
	"sync/atomic"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

var roomManager = NewRoomManager()

func main() {
	app := fiber.New()

	app.Get("/ws", websocket.New(func(c *websocket.Conn) {
		// 获取查询参数中的房间ID
		roomId := -1
		if id := c.Query("id"); id != "" {
			if parsedId, err := strconv.Atoi(id); err == nil {
				roomId = parsedId
			}
		}

		// 如果没有指定房间ID,则创建新房间
		if roomId == -1 {
			roomId = roomManager.GetNewRoomId()
		}

		// 获取或创建房间
		room := roomManager.GetRoom(roomId)
		if room == nil {
			// 房间不存在,创建新房间
			room = roomManager.AddRoom(roomId)
		} else {
			// 房间存在,检查是否已满
			if room.GetPlayerCount() >= 2 {
				c.WriteJSON(map[string]interface{}{
					"error": "房间已满",
				})
				c.Close()
				return
			}
		}

		// 服务用户连接
		serveUserInRoom(c, room)
	}))

	log.Fatal(app.Listen(":28080"))
}

func serveUserInRoom(c *websocket.Conn, room *Room) {
	// 添加用户到房间
	ctx := room.CtxManager.AddUser(c)
	defer room.CtxManager.DelUser(ctx.Id)
	defer c.Close()

	// 广播房间信息
	room.CtxManager.BroadcastRoomInfo(room.ChapterID)

	// 如果房间未运行,启动房间
	if !room.IsRunning {
		go room.Start()
	}

beforeGame:
	for {
		messageType, data, err := c.ReadMessage()
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
			if ctx.Id == room.CtxManager.FirstUser {
				atomic.StoreInt32(&room.ChapterID, int32(msg.ChapterId))
				room.CtxManager.BroadcastRoomInfo(room.ChapterID)
			}
		case messages.MsgTypeReady:
			atomic.AddInt32(&room.ReadyCount, 1)
			break beforeGame
		}
	}

	// 等待游戏开始
	<-ctx.startChan

	// 游戏主循环
	for {
		messageType, data, err := c.ReadMessage()
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
				ctx.Id,
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
				ctx.Id,
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
				ctx.Id,
			)
		case messages.MsgTypeRequestEndGame:
			room.Destroy()
			return
		}
	}
}
