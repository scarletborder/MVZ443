package roomatom

import (
	"mvzserver/clients"
	"mvzserver/constants"

	"github.com/gofiber/websocket/v2"
)

type PlayerMessage = clients.PlayerMessage

func (r *Room) HandleClientJoin(c *websocket.Conn) {
	ctx := r.RoomCtx.CreateClientCtxFromConn(c)
	// 创建一个新的玩家实例
	p := clients.NewPlayer(ctx, r.incomingMessages)

	r.register <- p // 将玩家加入到注册通道

	// TODO： 加入短线重连机制,.具体见我和gemini对话

	// 开始服务
	r.StartServeClient(c)
}

// 状态机循环的处理函数

func (r *Room) handleRegister(player *clients.Player) {
	// ... 注册客户端逻辑 ...
	// 在 Lobby 状态下才允许新玩家加入
	if r.GameStage == constants.STAGE_InLobby {
		// 向 context 中注册用户
		r.RoomCtx.AddUser(player)
		// TODO: 广播人数变化
	} else {
		// 拒绝加入
	}
}

func (r *Room) handleUnregister(player *clients.Player) {
	// ... 注销客户端逻辑 ...
	r.RoomCtx.DelUser(player.Ctx.Id) // 向 context 中注销用户
	// 关闭连接
	if player.Ctx != nil && player.Ctx.Conn != nil {
		player.Ctx.Close()
	}
	// 删除实例
	// 广播人数变化，如果状态是 Preparing/InGame，可能需要特殊处理
}

// 处理玩家消息
func (r *Room) handlePlayerMessage(msg PlayerMessage) {
	// decode

	// 过滤掉所有晚于当前房间ctx帧的消息
}

func (r *Room) runGameTick() {}
