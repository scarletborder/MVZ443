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

	// 游戏状态
	ChapterID  int32
	ReadyCount int32
	Seed       int32
	IsRunning  bool

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
		if r.ReadyCount > 0 && atomic.LoadInt32(&r.ReadyCount) == int32(r.GetPlayerCount()) {
			// 通知所有玩家游戏开始
			for _, ctx := range r.CtxManager.Clients {
				ctx.startChan <- struct{}{}
			}
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
	r.CtxManager.BroadcastGameStart()
	timer := time.NewTicker(constants.FrameTick * time.Millisecond)

	for {
		select {
		case <-timer.C:
			// fmt.Printf("FrameID: %d\n", r.FrameID)
			// 判断是否所有的玩家的frameID都已经同步
			if !r.HasAllPlayerSync() {
				continue
			}
			// 广播
			r.broadcastGameState()
		case <-r.GameDeadChan:
			return
		}
	}
}

func (r *Room) broadcastGameState() {
	r.FrameID++

	if len(r.Logic.msgs) == 0 {
		// 构建一个blank msg
		data, err := messages.EncodeMessage(messages.BlankMsg{
			Type:    messages.MsgTypeBlank,
			FrameID: r.FrameID,
		})
		if err != nil {
			return
		}
		r.Logic.msgs = append(r.Logic.msgs, data)
	}

	for _, ctx := range r.CtxManager.Clients {
		ctx.WriteJSON(r.Logic.msgs)
	}

	r.Logic.Reset()
}

func (r *Room) GetPlayerCount() int {
	return r.CtxManager.GetPlayerCount()
}

func (r *Room) HasAllPlayerSync() bool {
	// 延迟等待.最多容忍 maxDelayFrames 帧的延迟
	var minFrameID uint16 = r.FrameID
	if r.FrameID < constants.MaxDelayFrames {
		minFrameID = 0
	} else {
		minFrameID = r.FrameID - constants.MaxDelayFrames
	}

	for _, frameID := range r.CtxManager.PlayerFrameID {
		if frameID < minFrameID {
			return false
		}
	}
	return true
}

func (r *Room) UpdatePlayerFrameID(uid int, frameID uint16) {
	// fmt.Printf("UpdatePlayerFrameID: uid: %d, frameID: %d\n", uid, frameID)
	if frameID > r.CtxManager.PlayerFrameID[uid] {
		r.CtxManager.PlayerFrameID[uid] = frameID
	}
}

func (r *Room) Destroy() {
	r.CtxManager.CloseAll()
	r.GameDeadChan <- struct{}{}
}
