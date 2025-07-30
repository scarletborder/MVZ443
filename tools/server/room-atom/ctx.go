package roomatom

import (
	"math/rand"
	"mvzserver/clients"
	"mvzserver/messages"
	"sync"
	"sync/atomic"

	"github.com/gofiber/websocket/v2"
)

type ClientCtx = clients.ClientCtx

// ctxManager 使用 sync.Map 保证并发安全
type ctxManager struct {
	FirstUser     int
	Clients       sync.Map // key: int, value: *ClientCtx
	PlayerFrameID sync.Map // key: int, value: uint16
	nextId        int32    // 用于生成用户ID，初始值设置为100
}

func newCtxManager() *ctxManager {
	return &ctxManager{
		nextId: 100,
	}
}

// AddUser 添加一个用户，并生成一个唯一的ID
func (m *ctxManager) AddUser(conn *websocket.Conn) *ClientCtx {
	newId := int(atomic.AddInt32(&m.nextId, 1))
	uc := clients.NewClientCtx(conn, newId)
	// 如果 FirstUser 还没设置，则设置为第一个加入的用户
	if m.FirstUser == 0 {
		m.FirstUser = newId
	}
	m.Clients.Store(newId, uc)
	return uc
}

// DelUser 删除指定用户
func (m *ctxManager) DelUser(id int) {
	m.Clients.Delete(id)
}

// CloseAll 关闭所有用户连接
func (m *ctxManager) CloseAll() {
	m.Clients.Range(func(key, value interface{}) bool {
		if uc, ok := value.(*ClientCtx); ok {
			uc.Close()
		}
		return true
	})
}

// GetPeerAddr 返回所有连接的远程地址
func (m *ctxManager) GetPeerAddr() []string {
	var addrs []string
	m.Clients.Range(func(key, value interface{}) bool {
		if uc, ok := value.(*ClientCtx); ok {
			addrs = append(addrs, uc.Conn.RemoteAddr().String())
		}
		return true
	})
	return addrs
}

// BroadcastRoomInfo 广播房间信息
func (m *ctxManager) BroadcastRoomInfo(chapterID int32, roomid int) {
	peerAddrs := m.GetPeerAddr()
	m.Clients.Range(func(key, value interface{}) bool {
		if uc, ok := value.(*ClientCtx); ok {
			uc.Conn.WriteJSON(messages.RoomInfo{
				Type:      messages.MsgTypeRoomInfo,
				RoomID:    roomid,
				LordID:    m.FirstUser,
				MyID:      uc.Id,
				ChapterId: int(chapterID),
				Peer:      peerAddrs,
			})
		}
		return true
	})
}

// BroadcastGameStart 广播游戏开始消息
func (m *ctxManager) BroadcastGameStart() {
	// 初始化所有玩家的 frameID 为 0
	m.Clients.Range(func(key, value interface{}) bool {
		if id, ok := key.(int); ok {
			m.PlayerFrameID.Store(id, uint16(0))
		}
		return true
	})

	seed := rand.Int()
	m.Clients.Range(func(key, value interface{}) bool {
		if uc, ok := value.(*ClientCtx); ok {
			uc.WriteJSON(map[string]interface{}{
				"type": 0x01,
				"seed": seed,
				"myID": uc.Id,
			})
		}
		return true
	})
}

// GetPlayerCount 返回当前玩家数量
func (m *ctxManager) GetPlayerCount() int {
	count := 0
	m.Clients.Range(func(key, value interface{}) bool {
		count++
		return true
	})
	return count
}
