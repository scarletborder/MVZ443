package clients

import (
	"mvzserver/constants"

	"github.com/gofiber/websocket/v2"
)

// client player context
// 封装如长连接等信息
// 游戏逻辑无关, 因为帧同步游戏暂时不记录游戏玩家行为

type ClientCtx struct {
	Conn *websocket.Conn // 长连接

	// 信息
	Id int // 用户id

	// 帧同步信息

	// 最近服务器获知的该用户的所在帧
	LatestFrameID uint16

	// 最近该用户ACK的帧
	LatestAckFrameID uint16

	// 其他信息
	ReconnectionToken string                // 重连令牌， 用服务器对称加密得到的包含有用户id,房间信息的token           // 用于重连验证的票据
	State             constants.PlayerState // 当前状态（在线/断线）
}

func NewClientCtx(conn *websocket.Conn, id int) *ClientCtx {
	return &ClientCtx{
		Conn: conn,
		Id:   id,
	}
}

func (c *ClientCtx) Close() {
	c.Conn.Close()
}

func (c *ClientCtx) WriteJSON(v interface{}) error {
	return c.Conn.WriteJSON(v)
}
