package main

import (
	"strconv"

	"github.com/gofiber/websocket/v2"
)

func HandleWS(c *websocket.Conn) {
	// 获取查询参数中的房间ID
	roomId := -1
	if id := c.Query("id"); id != "" {
		if parsedId, err := strconv.Atoi(id); err == nil {
			roomId = parsedId
		}
	}

	// 如果没有指定房间ID,则创建新房间
	if roomId == -1 {
		roomId = roomManager.GetNewRoomId()
	}

	// 获取或创建房间
	room := roomManager.GetRoom(roomId)
	if room == nil {
		// 房间不存在,创建新房间
		room = roomManager.AddRoom(roomId)
	} else {
		// 房间存在,检查是否已满
		if room.GetPlayerCount() >= 2 {
			c.WriteJSON(map[string]interface{}{
				"error": "房间已满",
			})
			c.Close()
			return
		}
	}

	// 服务用户连接
	serveUserInRoom(c, room)
}
