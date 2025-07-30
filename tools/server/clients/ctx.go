package clients

import "github.com/gofiber/websocket/v2"

// client player context
// 封装如长连接等信息
// 游戏逻辑无关, 因为帧同步游戏暂时不记录游戏玩家行为

type ClientCtx struct {
	Conn *websocket.Conn // 长连接

	// 信息
	Id int // 用户id

	// 其他信息

	// Deprecated: 不再需要,由状态机来驱动开始游戏
	StartChan chan struct{}
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
