package app

import (
	"crypto/tls"
	"fmt"
	"log"
	"mvzserver/handlers"
	roommanager "mvzserver/room-manager"
	"net"
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/websocket/v2"
	"golang.org/x/crypto/acme/autocert"
)

type App struct {
	fiberApp    *fiber.App   // Fiber 应用实例
	NetListener net.Listener // 网络监听器

	RoomManager *roommanager.RoomManager // 房间管理器
}

type AppConfig struct {
	UseCert     bool   // 启用通过 Let's Encrypt 自动管理证书
	UseSelfCert string // 启用自签名证书的路径,例如 `/etc/letsencrypt/live/scarletborder.cn`
	UsePort     int    // 指定监听端口
}

func NewApp(cfg AppConfig) *App {
	// 新建room manager
	var roomManager = roommanager.NewRoomManager()

	// 新建网络服务
	// 网络服务在内部再设置监听
	var serverHandler = handlers.NewServerHandler(roomManager)
	fiberApp, ln := CreateFiberApp(cfg, serverHandler)

	return &App{
		fiberApp:    fiberApp,
		NetListener: ln,
		RoomManager: roomManager,
	}
}

// 创建 Fiber 应用
func CreateFiberApp(cfg AppConfig, serverHandler *handlers.ServerHandler) (fapp *fiber.App, ln net.Listener) {
	var err error
	fapp = fiber.New()
	// 使用 CORS 中间件配置
	fapp.Use(cors.New(cors.Config{
		AllowOrigins:     "*", // 如需限制域名，请修改此处
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin, Content-Type, Accept",
		AllowCredentials: false,
		MaxAge:           3600,
	}))

	// 注册路由（包括 websocket 和其它接口）
	fapp.Get("/ws", websocket.New(serverHandler.HandleWS))
	fapp.Get("/list", serverHandler.HandleListRoom)

	if cfg.UseCert {
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
		ln, err = tls.Listen("tcp", ":443", tlsConfig)
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
		return fapp, ln
	} else {
		// 监听指定端口
		portText := fmt.Sprintf(":%d", cfg.UsePort)
		if cfg.UseSelfCert != "" {
			// 使用自签名证书模式
			log.Println("启用自签名证书模式，监听 443 端口")
			cer, err := tls.LoadX509KeyPair(fmt.Sprintf("%s/cert.pem", cfg.UseSelfCert), fmt.Sprintf("%s/privkey.pem", cfg.UseSelfCert))
			if err != nil {
				log.Fatal("加载证书失败:", err)
			}

			config := &tls.Config{
				Certificates: []tls.Certificate{cer},
			}

			ln, err = tls.Listen("tcp", ":443", config)
			if err != nil {
				log.Fatal("监听端口失败:", err)
			}

			return fapp, ln
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
			ln, err = tls.Listen("tcp", portText, config)
			if err != nil {
				panic(err)
			}

			// Start server with https/ssl enabled on http://localhost:443
			return fapp, ln
		}
	}
}

func (app *App) Run() {
	log.Fatal(app.fiberApp.Listener(app.NetListener))
}
