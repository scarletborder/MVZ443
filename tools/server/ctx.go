package main

import (
	"math/rand"
	"mvzserver/messages"

	"github.com/gofiber/websocket/v2"
)

// 用户context

type userCtx struct {
	Id        int
	Conn      *websocket.Conn
	startChan chan struct{}
}

func newUserCtx(conn *websocket.Conn, id int) *userCtx {
	return &userCtx{
		Conn:      conn,
		Id:        id,
		startChan: make(chan struct{}, 1),
	}
}

func (u *userCtx) Close() {
	u.Conn.Close()
}

func (u *userCtx) WriteJSON(v interface{}) error {
	return u.Conn.WriteJSON(v)
}

// context manager
type ctxManager struct {
	FirstUser     int
	Clients       map[int]*userCtx
	PlayerFrameID map[int]uint16
}

func newCtxManager() *ctxManager {
	return &ctxManager{
		Clients: make(map[int]*userCtx),
	}
}

func (m *ctxManager) AddUser(conn *websocket.Conn) *userCtx {
	newId := len(m.Clients) + 100
	if len(m.Clients) == 0 {
		m.FirstUser = newId
	}
	m.Clients[newId] = newUserCtx(conn, newId)
	return m.Clients[newId]
}

func (m *ctxManager) DelUser(id int) {
	delete(m.Clients, id)
}

// 关闭全部连接
func (m *ctxManager) CloseAll() {
	for _, ctx := range m.Clients {
		ctx.Close()
	}
}

// 获得玩家addr
func (m *ctxManager) GetPeerAddr() []string {
	var addrs []string
	for _, ctx := range m.Clients {
		addrs = append(addrs, ctx.Conn.RemoteAddr().String())
	}
	return addrs
}

// RoomInfo
func (m *ctxManager) BroadcastRoomInfo(chapterID int32) {
	for _, ctx := range m.Clients {
		ctx.Conn.WriteJSON(messages.RoomInfo{
			Type:      messages.MsgTypeRoomInfo,
			RoomID:    0,
			LordID:    m.FirstUser,
			MyID:      ctx.Id,
			ChapterId: int(chapterID),
			Peer:      m.GetPeerAddr(),
		})
	}
}

// 游戏正式开始
func (m *ctxManager) BroadcastGameStart() {
	// 初始化frameID
	for idx := range m.Clients {
		m.PlayerFrameID[idx] = 0
	}

	seed := rand.Int()
	for idx, ctx := range m.Clients {
		ctx.WriteJSON(map[string]interface{}{
			"type": 0x01,
			"seed": seed,
			"myID": idx,
		})
	}
}

func (m *ctxManager) GetPlayerCount() int {
	return len(m.Clients)
}

// // every server tick, send game loop message
// func (m *ctxManager) BroadcastGameLoop(msgs []messages.MessageSend) {
// 	for _, ctx := range m.Clients {
// 		for _, msg := range msgs {
// 			ctx.WriteJSON(msg)
// 		}
// 	}
// }
