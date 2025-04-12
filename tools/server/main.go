package main

import (
	"log"
	"mvzserver/messages"
	"sync/atomic"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/websocket/v2"
)

var roomManager = NewRoomManager()

func main() {
	app := fiber.New()
	// 使用 CORS 中间件
	app.Use(cors.New(cors.Config{
		// 允许所有域名访问，如果需要限制，请指定具体的域名，例如 "http://example.com"
		AllowOrigins: "*",
		// 允许的请求方法
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
		// 允许的请求头
		AllowHeaders: "Origin, Content-Type, Accept",
		// 允许浏览器发送 Cookie 及认证信息
		AllowCredentials: false,
		// 预检请求的缓存时间，单位秒
		MaxAge: 3600,
	}))
	app.Get("/ws", websocket.New(HandleWS))
	app.Get("/list", HandleListRoom)

	log.Fatal(app.Listen(":28080"))
}

func serveUserInRoom(c *websocket.Conn, room *Room) {
	// 添加用户到房间
	ctx := room.CtxManager.AddUser(c)
	defer room.CtxManager.DelUser(ctx.Id)
	defer c.Close()

	// 广播房间信息
	room.CtxManager.BroadcastRoomInfo(room.ChapterID, room.ID)

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
				room.CtxManager.BroadcastRoomInfo(room.ChapterID, room.ID)
			}
		case messages.MsgTypeReady:
			atomic.AddInt32(&room.ReadyCount, 1)
			break beforeGame
		}
	}

	// 等待游戏开始
	<-ctx.startChan

	// 游戏主循环
	// 随时接收
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
				ctx.Id,
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
				ctx.Id,
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
				ctx.Id,
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
