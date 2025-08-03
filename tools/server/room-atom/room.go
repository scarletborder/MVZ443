package roomatom

// 定义room服务
// Room 结构体、状态机主循环、状态切换、房间属性和方法

import (
	"crypto/subtle"
	"log"
	"math/rand"
	"mvzserver/clients"
	"mvzserver/constants"
	messages "mvzserver/messages/pb"
	gamelogic "mvzserver/room-atom/game-logic" // 只能这里导入,TODO 删除 logic导入room
	"runtime/debug"
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
	incomingMessages chan *PlayerMessage
	// 游戏逻辑操作管道
	ingameOperations chan *messages.InGameOperation

	// 安全
	key string // 房间密钥

	// 游戏状态
	GameStage *constants.AtomStage
	ChapterID uint32
	StageID   uint32
	Seed      int32

	// manager
	destroyOnce    sync.Once
	LastActiveTime time.Time  // 上次活动时间
	StopChan       chan<- int // 通知房间管理器的停止信号通道
}

func NewRoom(id int, stopChan chan int) *Room {
	gameOperationChan := make(chan *messages.InGameOperation, 128)
	logic := gamelogic.NewGameLogic(gameOperationChan)
	seed := rand.Int31n(40960000) // 随机种子

	return &Room{
		ID:      id,
		RoomCtx: NewRoomCtx(),
		Logic:   logic,

		ChapterID: 0,
		StageID:   0,
		Seed:      seed,

		LastActiveTime: time.Now(),
		key:            "",
		GameStage:      constants.NewAtomStage(constants.STAGE_InLobby),
		StopChan:       stopChan,
		destroyOnce:    sync.Once{},

		// 网络
		register:         make(chan *clients.Player),
		unregister:       make(chan *clients.Player),
		reconnect:        make(chan clients.ReconnectRequest),
		incomingMessages: make(chan *PlayerMessage, 128),
		ingameOperations: gameOperationChan,
	}
}

// 重置房间为大厅状态， 以允许下一场游戏
func (room *Room) Reset() {
	room.RoomCtx.Reset()
	room.Logic.Reset()
	// room 本身reset
	room.ChapterID = 0
	room.StageID = 0
	room.Seed = rand.Int31n(40960000)             // 重置随机种子
	room.LastActiveTime = time.Now()              // 重置最后活动时间
	room.GameStage.Store(constants.STAGE_InLobby) // 重置游戏状态为大厅
	// 清空ingameOperations
	for len(room.ingameOperations) > 0 {
		<-room.ingameOperations // 清空管道
	}
}

// 摧毁房间(直接入口)
// 不应该在这里调用房间的游戏逻辑
// 而应该是游戏逻辑接受后调用摧毁房间
func (room *Room) Destroy() {
	defer func() {
		if r := recover(); r != nil {
			// 发生了 panic，r 是 panic 的值
			log.Printf("摧毁房间出错:捕获到 Panic: %v\n", r)

			// 打印详细的堆栈信息，对于调试非常重要
			// debug.Stack() 返回格式化好的当前 goroutine 的堆栈跟踪
			log.Printf("堆栈信息:\n%s", string(debug.Stack()))

			// 在这里，你可以执行一些额外的清理工作，或者上报错误到监控系统
			log.Println("程序已从 panic 中恢复，将继续运行。")
		}
	}()

	room.destroyOnce.Do(func() {
		// 发送房间关闭
		room.RoomCtx.BroadcastMessage(&messages.RoomResponse{
			Payload: &messages.RoomResponse_RoomClosed{
				RoomClosed: &messages.ResponseRoomClosed{
					Message: "Room is closed",
				},
			},
		}, []int{})

		// 通知房间关闭, 通过游戏状态来做
		room.GameStage.Store(constants.STAGE_CLOSED)

		// 清空各个存储

		// 房间

		// context
		// 用户

		// 定时器
		if room.RoomCtx.GameTicker != nil {
			room.RoomCtx.GameTicker.Stop()
			room.RoomCtx.GameTicker = nil
		}

		room.RoomCtx.CloseAll()

		// 最后通知房间管理器， 移除我的引用
		room.StopChan <- room.ID
	})
}

/* 属性操作 */

func (room *Room) GetPlayerCount() uint32 {
	// 已在 ctxManager 内部使用 Range 进行计数
	return room.RoomCtx.GetPlayerCount()
}

func (room *Room) CheckKeyCorrect(key string) bool {
	// 检查密钥是否正确
	// 时长无关的检查（异或）
	return subtle.ConstantTimeCompare([]byte(room.key), []byte(key)) == 1
}

// 设置房间密钥
func (room *Room) SetKey(key string) {
	room.key = key
}

func (room *Room) HasKey() bool {
	// 检查是否有密钥
	return room.key != ""
}

/* utils */
func (room *Room) HasAllPlayerReady() bool {
	// 检查是否所有玩家都准备就绪
	allReady := true
	room.RoomCtx.Players.Range(func(key int, value *clients.Player) bool {
		if !value.IsReady {
			allReady = false // 发现一个未准备的
			return false     // 立刻停止遍历 (Range 的核心特性)
		}
		return true // 继续检查下一个
	})
	return allReady
}

func (room *Room) HasAllPlayerLoaded() bool {
	// 检查是否所有玩家都加载完毕
	allLoaded := true
	room.RoomCtx.Players.Range(func(key int, value *clients.Player) bool {
		if !value.IsLoaded {
			allLoaded = false // 发现一个未加载的
			return false      // 立刻停止遍历 (Range 的核心特性)
		}
		return true // 继续检查下一个
	})
	return allLoaded
}

// 设置游戏逻辑定时器
func (room *Room) PlayerReadyCount() uint32 {
	count := uint32(0)
	room.RoomCtx.Players.Range(func(key int, value *clients.Player) bool {
		if value.IsReady {
			count++ // 统计准备好的玩家数量
		}
		return true
	})
	return count
}
