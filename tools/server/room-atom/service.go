package roomatom

// 定义room服务

import (
	"math/rand"
	gamelogic "mvzserver/room-atom/game-logic" // 只能这里导入,TODO 删除 logic导入room
	"time"
)

type Room struct {
	// 基础属性
	ID      int
	RoomCtx *RoomCtx
	Logic   *gamelogic.GameLogic

	// 安全
	key string // 房间密钥

	// 游戏状态
	ChapterID   int32
	ReadyCount  int32
	Seed        int32
	IsRunning   bool
	gameStarted bool

	LastActiveTime time.Time // 上次活动时间

	// 网络
	FrameID uint16 // 当前帧ID

	// 控制通道
	GameDeadChan      chan struct{}
	GameLoopStartChan chan struct{}
}

func NewRoom(id int) *Room {
	return &Room{
		ID:                id,
		RoomCtx:           NewRoomCtx(),
		Logic:             gamelogic.NewGameLogic(),
		ChapterID:         0,
		ReadyCount:        0,
		Seed:              rand.Int31n(40960000),
		GameDeadChan:      make(chan struct{}),
		GameLoopStartChan: make(chan struct{}, 1),
		FrameID:           0,
		LastActiveTime:    time.Now(),
		key:               "",
	}
}

func (r *Room) Destroy() {
	r.RoomCtx.CloseAll()
	// 通知房间关闭
	r.GameDeadChan <- struct{}{}

	r.IsRunning = true
	r.gameStarted = false
}

func (r *Room) Start() {
	// TODO: 使用状态机驱动
	// 等待游戏开始
	r.waitGameStart()

	// 开始游戏主循环
	r.IsRunning = true
	r.gameLoop()
}

func (r *Room) GetPlayerCount() int {
	// 已在 ctxManager 内部使用 Range 进行计数
	return r.RoomCtx.GetPlayerCount()
}
