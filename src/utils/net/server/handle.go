package main

import (
	"fmt"
	"mvzserver/messages"
	"sync/atomic"
	"time"

	"github.com/gofiber/websocket/v2"
)

func serveUser(c *websocket.Conn) {
	// 添加用户
	ctx := CtxManager.AddUser(c)
	_ = ctx
	defer CtxManager.DelUser(ctx.Id)
	defer c.Close()

	// 通知其他用户加入房间
	CtxManager.BroadcastRoomInfo((atomic.LoadInt32(&chapterID)))

beforegame:
	for {
		var msg map[string]interface{}
		// 服务
		err := c.ReadJSON(&msg)
		if err != nil {
			return // leave
		}

		thisType := msg["type"].(float64)

		switch int(thisType) {
		case messages.MsgTypeRequestJoin:
			// 请求加入房间
			// TODO: 忽略,因为handle入口已经处理哦
			continue
		case messages.MsgTypeRequestChooseMap:
			// 请求选择地图
			if ctx.Id == CtxManager.FirstUser {
				atomic.StoreInt32(&chapterID, int32(msg["chapterId"].(float64)))
				CtxManager.BroadcastRoomInfo((atomic.LoadInt32(&chapterID)))
			}
			continue

		case messages.MsgTypeReady:
			// 准备就绪
			atomic.AddInt32(&readyMan, 1)
			break beforegame
		}
	}

	// 等待游戏开始
	<-ctx.startChan
	fmt.Println("game start")

	// 游戏开始
	for {
		var msg map[string]interface{}
		// 服务
		err := c.ReadJSON(&msg)
		if err != nil {
			return // leave
		}

		thisType := int(msg["type"].(float64))

		switch thisType {
		//TODO: 处理消息
		case messages.MsgTypeRequestCardPlant:
			gameLogic.PlantCard(int(msg["col"].(float64)), int(msg["row"].(float64)), int(msg["pid"].(float64)),
				int(msg["level"].(float64)), ctx.Id)

		case messages.MsgTypeRequestRemovePlant:
			gameLogic.RemoveCard(int(msg["col"].(float64)), int(msg["row"].(float64)), int(msg["pid"].(float64)),
				ctx.Id)

		case messages.MsgTypeRequestEndGame:
			// 游戏结束
			fmt.Printf("game end")
			go func() {
				time.Sleep(3 * time.Second)
				destoryAll()
			}()
			return
		}
	}
}
