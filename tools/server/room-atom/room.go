package roomatom

// 定义room服务
// Room 结构体、状态机主循环、状态切换、房间属性和方法

import (
	"crypto/subtle"
	"math/rand"
	"mvzserver/clients"
	"mvzserver/constants"
	gamelogic "mvzserver/room-atom/game-logic" // 只能这里导入,TODO 删除 logic导入room
	"sync"
	"time"
)

type Room struct {
	// 基础属性
	ID      int
	RoomCtx *RoomCtx
	Logic   *gamelogic.GameLogic

	// 网络
	register         chan *clients.Player
	unregister       chan *clients.Player
	reconnect        chan clients.ReconnectRequest
	incomingMessages chan PlayerMessage

	// 安全
	key string // 房间密钥

	// 游戏状态
	GameStage  constants.Stage
	ChapterID  int32
	ReadyCount int32
	Seed       int32

	// manager
	destroyOnce    sync.Once
	LastActiveTime time.Time  // 上次活动时间
	StopChan       chan<- int // 通知房间管理器的停止信号通道
}

func NewRoom(id int, stopChan chan int) *Room {
	return &Room{
		ID:             id,
		RoomCtx:        NewRoomCtx(),
		Logic:          gamelogic.NewGameLogic(),
		ChapterID:      0,
		ReadyCount:     0,
		Seed:           rand.Int31n(40960000),
		LastActiveTime: time.Now(),
		key:            "",
		GameStage:      constants.STAGE_InLobby,
		StopChan:       stopChan,
		destroyOnce:    sync.Once{},

		// 网络
		register:         make(chan *clients.Player),
		unregister:       make(chan *clients.Player),
		reconnect:        make(chan clients.ReconnectRequest),
		incomingMessages: make(chan PlayerMessage, 128),
	}
}

// 摧毁房间(直接入口)
// 不应该在这里调用房间的游戏逻辑
// 而应该是游戏逻辑接受后调用摧毁房间
func (r *Room) Destroy() {
	r.destroyOnce.Do(func() {
		// 通知房间关闭, 通过游戏状态来做
		r.GameStage = constants.STAGE_CLOSED

		// 清空各个存储

		// 房间

		// context
		// 用户

		// 定时器
		if r.RoomCtx.GameTicker != nil {
			r.RoomCtx.GameTicker.Stop()
			r.RoomCtx.GameTicker = nil
		}

		r.RoomCtx.CloseAll()

		// 最后通知房间管理器， 移除我的引用
		r.StopChan <- r.ID
	})
}

/* 属性操作 */

func (r *Room) GetPlayerCount() int {
	// 已在 ctxManager 内部使用 Range 进行计数
	return r.RoomCtx.GetPlayerCount()
}

func (r *Room) CheckKeyCorrect(key string) bool {
	// 检查密钥是否正确
	// 时长无关的检查（异或）
	return subtle.ConstantTimeCompare([]byte(r.key), []byte(key)) == 1
}

// 设置房间密钥
func (r *Room) SetKey(key string) {
	r.key = key
}

func (r *Room) HasKey() bool {
	// 检查是否有密钥
	return r.key != ""
}
