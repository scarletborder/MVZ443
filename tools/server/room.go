package main

import (
    "sync/atomic"
    "time"
    "math/rand"
)

type Room struct {
    // 基础属性
    ID int
    CtxManager *ctxManager
    Logic *GameLogic
    
    // 游戏状态
    ChapterID int32
    ReadyCount int32
    Seed int32
    IsRunning bool
    
    // 控制通道
    GameDeadChan chan struct{}
    GameLoopStartChan chan struct{}
}

func NewRoom(id int) *Room {
    return &Room{
        ID: id,
        CtxManager: newCtxManager(),
        Logic: NewGameLogic(),
        ChapterID: 0,
        ReadyCount: 0,
        Seed: rand.Int31n(40960000),
        GameDeadChan: make(chan struct{}),
        GameLoopStartChan: make(chan struct{}, 1),
    }
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
    timer := time.NewTicker(100 * time.Millisecond)
    
    for {
        select {
        case <-timer.C:
            r.broadcastGameState()
        case <-r.GameDeadChan:
            return
        }
    }
}

func (r *Room) broadcastGameState() {
    if len(r.Logic.msgs) == 0 {
        for _, ctx := range r.CtxManager.Clients {
            ctx.WriteJSON([]interface{}{})
        }
    } else {
        for _, ctx := range r.CtxManager.Clients {
            ctx.WriteJSON(r.Logic.msgs)
        }
    }
    r.Logic.Reset()
}

func (r *Room) GetPlayerCount() int {
    return r.CtxManager.GetPlayerCount()
}

func (r *Room) Destroy() {
    r.CtxManager.CloseAll()
    r.GameDeadChan <- struct{}{}
}