package main

import (
	"math/rand"
	"mvzserver/constants"
	"mvzserver/messages"
	"sync/atomic"
	"time"
)

type Room struct {
	// 基础属性
	ID         int
	CtxManager *ctxManager
	Logic      *GameLogic

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
		CtxManager:        newCtxManager(),
		Logic:             NewGameLogic(),
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

/**
 * 获得下一帧(下一次发送的时候)ID
 */
func (r *Room) GetNextFrameID() uint16 {
	return r.FrameID + 1
}

func (r *Room) Start() {
	r.IsRunning = true

	// 监控房间状态
	go r.monitorRoom()

	// 等待游戏开始
	r.waitGameStart()

	// 开始游戏主循环
	r.gameLoop()
}

func (r *Room) monitorRoom() {
	for {
		time.Sleep(3 * time.Second)
		if r.GetPlayerCount() == 0 {
			r.GameDeadChan <- struct{}{}
			r.IsRunning = false
			return
		}
	}
}

func (r *Room) waitGameStart() {
waitLoop:
	for {
		// 当 ReadyCount 大于 0 且所有加入的玩家均准备完毕时，通知所有玩家游戏开始
		if r.ReadyCount > 0 && atomic.LoadInt32(&r.ReadyCount) == int32(r.GetPlayerCount()) {
			// 遍历所有客户端，通知玩家游戏开始
			r.CtxManager.Clients.Range(func(key, value interface{}) bool {
				if uc, ok := value.(*userCtx); ok {
					uc.startChan <- struct{}{}
				}
				return true
			})
			atomic.StoreInt32(&r.ReadyCount, 0)
			r.GameLoopStartChan <- struct{}{}
			break waitLoop
		}

		select {
		case <-r.GameDeadChan:
			return
		default:
			time.Sleep(1 * time.Second)
		}
	}
}

func (r *Room) gameLoop() {
	r.gameStarted = true
	r.CtxManager.BroadcastGameStart()
	timer := time.NewTicker(constants.FrameTick * time.Millisecond)

	for {
		select {
		case <-timer.C:
			// 判断是否所有的玩家的 frameID 都已经同步
			if !r.HasAllPlayerSync() {
				continue
			}
			// 更新最后活动时间
			r.LastActiveTime = time.Now()
			// 广播游戏状态
			r.broadcastGameState()
		case <-r.GameDeadChan:
			return
		}
	}
}

func (r *Room) broadcastGameState() {
	r.FrameID++ // 更新当前帧ID

	// 如果没有消息，则构建一个空消息
	if len(r.Logic.msgs) == 0 {
		data, err := messages.EncodeMessage(messages.BlankMsg{
			Type:    messages.MsgTypeBlank,
			FrameID: r.FrameID,
		})
		if err != nil {
			return
		}
		r.Logic.msgs = append(r.Logic.msgs, data)
	}

	// 广播消息给每个客户端，通过 sync.Map.Range 遍历所有连接
	r.CtxManager.Clients.Range(func(key, value interface{}) bool {
		if uc, ok := value.(*userCtx); ok {
			// 忽略错误处理，可根据实际需要添加
			uc.WriteJSON(r.Logic.msgs)
		}
		return true
	})

	r.Logic.Reset()
}

func (r *Room) GetPlayerCount() int {
	// 已在 ctxManager 内部使用 Range 进行计数
	return r.CtxManager.GetPlayerCount()
}

func (r *Room) HasAllPlayerSync() bool {
	// 延迟等待，最多容忍 maxDelayFrames 帧的延迟
	var minFrameID uint16
	if r.FrameID < constants.MaxDelayFrames {
		minFrameID = 0
	} else {
		minFrameID = r.FrameID - constants.MaxDelayFrames
	}

	synced := true
	// 遍历每个玩家的 frameID，若有任意玩家低于阈值，则返回 false
	r.CtxManager.PlayerFrameID.Range(func(key, value interface{}) bool {
		if frameID, ok := value.(uint16); ok {
			if frameID < minFrameID {
				synced = false
				return false
			}
		}
		return true
	})
	return synced
}

func (r *Room) UpdatePlayerFrameID(uid int, frameID uint16) {
	// 使用 Load 获取当前记录的 frameID
	if value, ok := r.CtxManager.PlayerFrameID.Load(uid); ok {
		if cur, ok := value.(uint16); ok {
			if frameID > cur {
				r.CtxManager.PlayerFrameID.Store(uid, frameID)
			}
		}
	} else {
		// 若不存在则直接存储
		r.CtxManager.PlayerFrameID.Store(uid, frameID)
	}
}

func (r *Room) Destroy() {
	r.CtxManager.CloseAll()
	// 通知房间关闭
	r.GameDeadChan <- struct{}{}

	r.IsRunning = false
}
