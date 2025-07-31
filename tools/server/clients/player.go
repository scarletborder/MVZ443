package clients

import (
	"log"

	"github.com/go-fiber/websocket/v2"
	"github.com/gofiber/websocket/v2"
)

// 直接转发客户端传来的数据， 不用封装message bytes，解析之后做
type PlayerMessage struct {
	player  *Player // 发送消息的玩家
	message []byte  // 消息内容
}

func NewPlayerMessage(player *Player, data []byte) *PlayerMessage {
	return &PlayerMessage{
		player:  player,
		message: data,
	}
}

type Player struct {
	Ctx      *ClientCtx           // 客户端上下文
	SendChan chan<- PlayerMessage // 客户端发送到服务器的消息

	// 游戏相关状态
	IsReady bool // 是否准备好

	// 游戏数据

}

func NewPlayer(ctx *ClientCtx, sendChan chan<- PlayerMessage) *Player {
	return &Player{
		Ctx:      ctx,
		IsReady:  false,    // 默认不准备
		SendChan: sendChan, // 发送通道
	}
}

func (p *Player) GetID() int {
	return p.Ctx.Id
}

// 读取pump
func (p *Player) ReadPump() {
	// 读取 Pump

	defer func() {
		// TODO: 发送掉线消息
	}()

	for {
		messageType, data, err := p.Ctx.Conn.ReadMessage()
		if err != nil {
			// 判断各种错误

			// 读取错误，可能是连接关闭
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Println("read error:", err)
			}
			return
		}

		// 忽略非二进制消息
		if messageType != websocket.BinaryMessage {
			continue
		}

		// decode

	}
}

// 写入要发送给客户端的信息
func (p *Player) Write() {

	// encode to binary message

}
