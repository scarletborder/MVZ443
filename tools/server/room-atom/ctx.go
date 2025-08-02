package roomatom

// RoomCtx、ClientCtx、AddUser、DelUser
// 消息发送 []byte 接口

import (
	"mvzserver/clients"
	"mvzserver/constants"

	"sync/atomic"
	"time"

	mapset "github.com/deckarep/golang-set/v2"
	"github.com/gofiber/websocket/v2"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/reflect/protoreflect"
)

type ClientCtx = clients.ClientCtx

// RoomCtx 使用 sync.Map 保证并发安全
// room ctx 维持用户相关的状态和信息
type RoomCtx struct {
	OwnerUserID int       // owner id of room
	Players     PlayerMap // key: int, value: *Player
	nextId      int32     // 用于生成用户ID，初始值设置为100

	// 网络
	// 发送给客户端的下一帧ID
	FrameID uint32

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

// 重置状态以允许下场游戏
func (m *RoomCtx) Reset() {
	m.FrameID = 0
	if m.GameTicker != nil {
		m.GameTicker.Stop()
	}
	m.GameTicker = nil // 重置为nil
	// players 的数据
	m.Players.Range(func(key int, player *clients.Player) bool {
		if player != nil {
			player.ResetData()
		}
		return true
	})
}

// -----------------
// tick

// 设置游戏逻辑定时器
func (m *RoomCtx) StartGameTicker() {
	if m.GameTicker != nil {
		m.GameTicker.Stop() // 停止之前的 ticker
	}
	m.GameTicker = time.NewTicker(constants.FrameIntervalMs * time.Millisecond)
}

// --------
// user

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

// -------------------
// 发送信息
// -------------------

// 广播
func (m *RoomCtx) BroadcastMessage(msg protoreflect.ProtoMessage, exclude_ids []int) {
	data, err := proto.Marshal(msg)
	if err != nil {
		panic(err) // 处理错误
	}
	// 先制作mapset
	excludeSet := mapset.NewSet[int]()
	if exclude_ids != nil {
		for _, id := range exclude_ids {
			excludeSet.Add(id)
		}
	}
	m.Players.Range(func(key int, player *clients.Player) bool {
		if player != nil && player.Ctx != nil && player.Ctx.Conn != nil {
			return true // 继续遍历
		}
		// 检查是否在排除列表中
		if excludeSet.Contains(player.Ctx.Id) {
			return true // 在排除列表中，继续遍历
		}

		player.Write(data) // 发送消息
		return true
	})
}

// 单播
func (m *RoomCtx) SendMessageToUser(msg protoreflect.ProtoMessage, userId int) {
	// 通过id 找到player
	if value, ok := m.Players.Load(userId); ok {
		m.SendMessageToUserByPlayer(msg, value)
	}
}

func (m *RoomCtx) SendMessageToUserByPlayer(msg protoreflect.ProtoMessage, player *Player) {
	data, err := proto.Marshal(msg)
	if err != nil {
		panic(err) // 处理错误
	}
	if player != nil && player.Ctx != nil && player.Ctx.Conn != nil {
		player.Write(data) // 发送消息
	}
}

// GetPlayerCount 返回当前玩家数量
func (m *RoomCtx) GetPlayerCount() uint32 {
	return uint32(m.Players.Len())
}
