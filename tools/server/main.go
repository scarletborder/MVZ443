package main

import (
	"log"
	"sync/atomic"
	"time"

	"math/rand"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

var chapterID int32 = 0
var readyMan int32 = 0
var gameLoopStartChan chan struct{}
var isGameRunning bool = false
var CtxManager = newCtxManager()
var gameLogic = NewGameLogic()
var seed int32 = 123456

func resetAll() {
	atomic.StoreInt32(&chapterID, 0)
	atomic.StoreInt32(&readyMan, 0)
	atomic.StoreInt32(&seed, rand.Int31n(40960000))
	gameLoopStartChan = make(chan struct{}, 1)
	GameStart()
}

func destoryAll() {
	CtxManager.CloseAll()
	CtxManager = newCtxManager()
	resetAll()
}

func GameStart() {
	isGameRunning = true
	thisGameDead := make(chan struct{})

	go func() {
		// validate living
		// 如果没人了
		for {
			time.Sleep(3 * time.Second)
			if len(CtxManager.Clients) == 0 {
				thisGameDead <- struct{}{}
				isGameRunning = false
				return
			}
		}
	}()

gameWaitStart:
	for {
		if readyMan > 0 && atomic.LoadInt32(&readyMan) == int32(len(CtxManager.Clients)) {
			// 游戏开始
			for _, ctx := range CtxManager.Clients {
				ctx.startChan <- struct{}{}
			}
			readyMan = 0
			gameLoopStartChan <- struct{}{}
			break gameWaitStart
		}
		select {
		case <-thisGameDead:
			return
		default:
			time.Sleep(1 * time.Second)
		}
	}

	// game main loop 游戏逻辑开始
	// 发送线程, 每100ms发送一次
	CtxManager.BroadcastGameStart()
	timer := time.NewTicker(100 * time.Millisecond)
	for {
		select {
		case <-timer.C:
			// 发送消息
			if len(gameLogic.msgs) == 0 {
				for _, ctx := range CtxManager.Clients {
					ctx.WriteJSON([]interface{}{})
				}
			} else {
				for _, ctx := range CtxManager.Clients {
					ctx.WriteJSON(gameLogic.msgs)
				}
			}

			// 每次发送消息后重置游戏逻辑
			gameLogic.Reset()
		case <-thisGameDead:
			return
		}
	}
}

func main() {
	app := fiber.New()
	app.Get("/ws", websocket.New(func(c *websocket.Conn) {
		// 用户加入事件驱动服务是否重启
		if len(CtxManager.Clients) == 0 && !isGameRunning {
			go resetAll()
		}
		serveUser(c)
	}))

	log.Fatal(app.Listen(":28080"))
}
