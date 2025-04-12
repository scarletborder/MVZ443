package main

import (
	"crypto/tls"
	"flag"
	"fmt"
	"log"
	"mvzserver/messages"
	"net/http"
	"sync/atomic"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/websocket/v2"
	"golang.org/x/crypto/acme/autocert"
)

var roomManager = NewRoomManager()

func main() {
	// 定义命令行参数, -p 表示使用 cert 自动获取证书的模式
	useCert := flag.Bool("s", false, "启用通过 Let's Encrypt 自动管理证书")
	useSelfCert := flag.String("c", "", "启用自签名证书,例如 `/etc/letsencrypt/live/scarletborder.cn`")
	usePort := flag.Int("p", 28080, "指定监听端口")
	flag.Parse()

	// 创建 Fiber 实例
	app := fiber.New()

	// 使用 CORS 中间件配置
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "*", // 如需限制域名，请修改此处
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin, Content-Type, Accept",
		AllowCredentials: false,
		MaxAge:           3600,
	}))

	// 注册路由（包括 websocket 和其它接口）
	app.Get("/ws", websocket.New(HandleWS))
	app.Get("/list", HandleListRoom)

	if *useCert {
		// 使用 Let's Encrypt 自动管理证书模式
		// 配置 autocert.Manager 自动管理 Let's Encrypt 证书
		m := autocert.Manager{
			Prompt:     autocert.AcceptTOS,
			HostPolicy: autocert.HostWhitelist("scarletborder.cn"), // 允许的域名
			Cache:      autocert.DirCache("certs"),                 // 证书缓存目录
		}

		// 构造 TLS 配置，自动获取证书
		tlsConfig := &tls.Config{
			GetCertificate: m.GetCertificate,
		}

		// 启动 HTTPS 服务
		ln, err := tls.Listen("tcp", ":443", tlsConfig)
		if err != nil {
			log.Fatal(err)
		}

		// 同时在 80 端口启动 HTTP 服务响应 ACME HTTP-01 验证请求
		go func() {
			httpServer := &http.Server{
				Addr:    ":80",
				Handler: m.HTTPHandler(nil),
			}
			log.Fatal(httpServer.ListenAndServe())
		}()

		log.Println("启用 HTTPS 模式，监听 443 端口")
		log.Fatal(app.Listener(ln))
	} else {
		// 监听指定端口
		portText := fmt.Sprintf(":%d", *usePort)
		if *useSelfCert != "" {
			// 使用自签名证书模式
			log.Println("启用自签名证书模式，监听 443 端口")
			cer, err := tls.LoadX509KeyPair(fmt.Sprintf("%s/cert.pem", *useSelfCert), fmt.Sprintf("%s/privkey.pem", *useSelfCert))
			if err != nil {
				log.Fatal("加载证书失败:", err)
			}

			config := &tls.Config{
				Certificates: []tls.Certificate{cer},
			}

			ln, err := tls.Listen("tcp", ":443", config)
			if err != nil {
				log.Fatal("监听端口失败:", err)
			}

			log.Fatal(app.Listener(ln))
		} else {
			// 使用默认模式，通过 28080 端口启动服务
			log.Println("启用普通模式，监听 28080 端口")
			// Create tls certificate
			cer, err := tls.LoadX509KeyPair("certs/ssl.cert", "certs/ssl.key")
			if err != nil {
				log.Fatal(err)
			}

			config := &tls.Config{Certificates: []tls.Certificate{cer}}

			// Create custom listener
			ln, err := tls.Listen("tcp", portText, config)
			if err != nil {
				panic(err)
			}

			// Start server with https/ssl enabled on http://localhost:443
			log.Fatal(app.Listener(ln))
		}
	}
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
