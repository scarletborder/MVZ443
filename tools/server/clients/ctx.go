package clients

import (
	"mvzserver/constants"

	"sync/atomic"

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

	// 最近服务器获知的该用户的所在帧（原子变量）
	LatestFrameID atomic.Uint32

	// 最近该用户ACK的帧（原子变量）
	LatestAckFrameID atomic.Uint32

	// 其他信息
	ReconnectionToken string                // 重连令牌， 用服务器对称加密得到的包含有用户id,房间信息的token           // 用于重连验证的票据
	State             constants.PlayerState // 当前状态（在线/断线）
}

func NewClientCtx(conn *websocket.Conn, id int) *ClientCtx {
	return &ClientCtx{
		Conn: conn,
		Id:   id,
		// atomic.Uint32 默认零值即可，无需额外初始化
	}
}

func (c *ClientCtx) Close() {
	c.Conn.Close()
}

func (c *ClientCtx) WriteJSON(v interface{}) error {
	return c.Conn.WriteJSON(v)
}

func (c *ClientCtx) UpdatePlayerFrame(frameId, ackFrameId uint32) {
	c.LatestFrameID.Store(frameId)
	c.LatestAckFrameID.Store(ackFrameId)
}
