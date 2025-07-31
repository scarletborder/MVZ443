package roomatom

// RoomCtx、ClientCtx、AddUser、DelUser
// 消息发送 []byte 接口

import (
	"math/rand"
	"mvzserver/clients"
	"mvzserver/messages"
	"sync/atomic"
	"time"

	"github.com/gofiber/websocket/v2"
)

type ClientCtx = clients.ClientCtx

// RoomCtx 使用 sync.Map 保证并发安全
// room ctx 维持用户相关的状态和信息
type RoomCtx struct {
	OwnerUserID int       // owner id of room
	Players     PlayerMap // key: int, value: *Player
	nextId      int32     // 用于生成用户ID，初始值设置为100

	// 网络
	FrameID uint16 // 当前帧ID

	// game logic ticker
	// 一直是nil 直到 InGame 状态切换前赋值
	GameTicker *time.Ticker
}

func NewRoomCtx() *RoomCtx {
	return &RoomCtx{
		FrameID:     0, // 初始帧ID为0
		OwnerUserID: 0, // unset
		nextId:      100,

		GameTicker: nil, // 初始没有， 只有开始游戏后才会NewTimer
	}
}

func (m *RoomCtx) CreateClientCtxFromConn(conn *websocket.Conn) *ClientCtx {
	newId := int(atomic.AddInt32(&m.nextId, 1))
	return clients.NewClientCtx(conn, newId)
}

// AddUser
func (m *RoomCtx) AddUser(p *clients.Player) {
	m.Players.Store(p.Ctx.Id, p)
	// 如果 OwnerUserID 还没设置，则设置为第一个加入的用户
	if m.OwnerUserID == 0 {
		m.OwnerUserID = p.Ctx.Id
	}
}

// DelUser 删除指定用户
func (m *RoomCtx) DelUser(id int) {
	m.Players.Delete(id)
}

// CloseAll 关闭所有用户连接
func (m *RoomCtx) CloseAll() {
	m.Players.Range(func(key int, player *clients.Player) bool {
		if player != nil && player.Ctx != nil {
			player.Ctx.Close()
		}
		return true
	})
}

// GetPeerAddr 返回所有连接的远程地址
func (m *RoomCtx) GetPeerAddr() []string {
	var addrs []string
	m.Players.Range(func(key int, player *clients.Player) bool {
		if player != nil && player.Ctx != nil && player.Ctx.Conn != nil {
			addrs = append(addrs, player.Ctx.Conn.RemoteAddr().String())
		}
		return true
	})
	return addrs
}

// 广播用户加入信息
// Deprecated: 移动到 room
func (m *RoomCtx) BroadcastUserJoin(userId int) {}

// BroadcastRoomInfo 广播房间信息
// Deprecated: 移动到 room
func (m *RoomCtx) BroadcastRoomInfo(chapterID int32, roomid int) {
	peerAddrs := m.GetPeerAddr()
	m.Players.Range(func(key int, player *clients.Player) bool {
		if player != nil && player.Ctx != nil && player.Ctx.Conn != nil {
			player.Ctx.Conn.WriteJSON(messages.RoomInfo{
				Type:      messages.MsgTypeRoomInfo,
				RoomID:    roomid,
				LordID:    m.OwnerUserID,
				MyID:      player.Ctx.Id,
				ChapterId: int(chapterID),
				Peer:      peerAddrs,
			})
		}
		return true
	})
}

// BroadcastGameStart 广播游戏开始消息
// Deprecated: 移动到 room
func (m *RoomCtx) BroadcastGameStart() {
	// 初始化所有玩家的 frameID 为 0
	m.Players.Range(func(id int, player *clients.Player) bool {
		// 假设有 PlayerFrameID 字段，未在原代码中声明
		player.Ctx.LatestFrameID = 0
		return true
	})

	seed := rand.Int()
	m.Players.Range(func(key int, player *clients.Player) bool {
		if player != nil && player.Ctx != nil {
			player.Ctx.WriteJSON(map[string]interface{}{
				"type": 0x01,
				"seed": seed,
				"myID": player.Ctx.Id,
			})
		}
		return true
	})
}

// GetPlayerCount 返回当前玩家数量
func (m *RoomCtx) GetPlayerCount() int {
	return m.Players.Len()
}
