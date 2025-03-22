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
		var msg map[string]interface{}
		err := c.ReadJSON(&msg)
		if err != nil {
			return
		}

		msgType := int(msg["type"].(float64))

		switch msgType {
		case messages.MsgTypeRequestChooseMap:
			if ctx.Id == room.CtxManager.FirstUser {
				atomic.StoreInt32(&room.ChapterID, int32(msg["chapterId"].(float64)))
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
		var msg map[string]interface{}
		err := c.ReadJSON(&msg)
		if err != nil {
			return
		}

		msgType := int(msg["type"].(float64))

		switch msgType {
		case messages.MsgTypeRequestCardPlant:
			room.Logic.PlantCard(
				int(msg["col"].(float64)),
				int(msg["row"].(float64)),
				int(msg["pid"].(float64)),
				int(msg["level"].(float64)),
				ctx.Id,
			)
		case messages.MsgTypeRequestRemovePlant:
			room.Logic.RemoveCard(
				int(msg["col"].(float64)),
				int(msg["row"].(float64)),
				int(msg["pid"].(float64)),
				ctx.Id,
			)
		case messages.MsgTypeRequestStarShards:
			room.Logic.UseStarShards(
				int(msg["col"].(float64)),
				int(msg["row"].(float64)),
				int(msg["pid"].(float64)),
				ctx.Id,
			)
		case messages.MsgTypeRequestEndGame:
			room.Destroy()
			return
		}
	}
}
