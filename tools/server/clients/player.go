package clients

import (
	"sync"

	"github.com/gofiber/websocket/v2"
)

// 直接转发客户端传来的数据， 不用封装message bytes，解析之后做
type PlayerMessage struct {
	Player *Player // 发送消息的玩家
	Data   []byte  // ws二进制消息内容
}

var playerMessagePool = sync.Pool{
	// New 指定了当池中没有可用对象时，如何创建一个新的
	New: func() interface{} {
		// 返回一个指向 PlayerMessage 的指针
		return new(PlayerMessage)
	},
}

func GetPlayerMessage(player *Player, data []byte) *PlayerMessage {
	// 从池中获取一个对象，类型是 interface{}，需要做类型断言
	msg := playerMessagePool.Get().(*PlayerMessage)

	// 初始化/重置对象的状态
	msg.Player = player
	msg.Data = data
	return msg
}

func ReleasePlayerMessage(msg *PlayerMessage) {
	// 重置对象，避免旧数据泄露
	msg.Player = nil
	msg.Data = nil

	// 将对象放回池中，等待下次复用
	playerMessagePool.Put(msg)
}

type Player struct {
	Ctx      *ClientCtx            // 客户端上下文
	SendChan chan<- *PlayerMessage // 客户端发送到服务器的消息

	// 游戏相关状态
	IsReady  bool // 是否准备好
	IsLoaded bool // 是否加载完毕

	// 游戏数据
	LastEnergySum  int32 // 上一次用户的Energy
	LastStarShards int32 // 上一次用户的StarShards
}

func NewPlayer(ctx *ClientCtx, sendChan chan<- *PlayerMessage) Player {
	return Player{
		Ctx:      ctx,
		IsReady:  false, // 默认不准备
		IsLoaded: false, // 默认不加载

		SendChan: sendChan, // 发送通道
	}
}

func (p *Player) ResetData() {
	p.IsReady = false
	p.IsLoaded = false
	p.LastEnergySum = 0
	p.LastStarShards = 0
	if p.Ctx != nil {
		p.Ctx.LatestFrameID.Store(0)    // 重置最新帧ID
		p.Ctx.LatestAckFrameID.Store(0) // 重置最新确认帧ID
	}
}

func (p *Player) GetID() int {
	return p.Ctx.Id
}

// 写入要发送给客户端的信息
func (p *Player) Write(bytes []byte) {
	_ = p.Ctx.Conn.WriteMessage(websocket.BinaryMessage, bytes)
	// TODO: 错判断， 重连
}

// TODO: 定义一个处理重连的东西
