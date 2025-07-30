package handlers

import (
	"mvzserver/constants"
	roommanager "mvzserver/room-manager"
	"mvzserver/types"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

// 处理器结构体
// 管理依赖
type ServerHandler struct {
	RoomMnager *roommanager.RoomManager
}

func NewServerHandler(roomMnager *roommanager.RoomManager) *ServerHandler {
	return &ServerHandler{RoomMnager: roomMnager}
}

// 利用 ServerHandler
func (sh *ServerHandler) HandleListRoom(c *fiber.Ctx) error {
	// 获取房间列表
	rooms := sh.RoomMnager.GetRooms()

	// 如果 rooms 是空的，将其设置为空数组
	if len(rooms) == 0 {
		rooms = []types.RoomsInfo{} // 将其设置为空数组
	}

	// 返回房间列表
	return c.JSON(rooms)
}

func (sh *ServerHandler) HandleWS(c *websocket.Conn) {
	// 获取查询参数中的房间ID
	roomId := -1
	if id := c.Query("id"); id != "" {
		if parsedId, err := strconv.Atoi(id); err == nil {
			roomId = parsedId
		}
	}

	_key := c.Query("key") // 密钥

	// TODO: 多一个参数, create / join，
	// 如果是create,则创建新房间,如果是join,则如果无指定id，返回失败信息

	// 如果没有指定房间ID,则创建新房间
	if roomId == -1 {
		roomId = sh.RoomMnager.GetNewRoomId()
	}

	// 获取或创建房间
	room := sh.RoomMnager.GetRoom(roomId)
	if room == nil {
		// 房间不存在,创建新房间
		room = sh.RoomMnager.AddRoom(roomId, _key)
		// 房间开始运行
		room.Run()
	} else {
		// 房间存在,检查密钥
		if room.CheckKeyCorrect(_key) == false {
			c.WriteJSON(map[string]interface{}{
				"success": false,
				"error":   "密钥错误",
			})
			c.Close()
			return
		}

		// 房间存在,检查是否已满
		if room.GetPlayerCount() >= 2 {
			c.WriteJSON(map[string]interface{}{
				"success": false,
				"error":   "房间已满",
			})
			c.Close()
			return
		}

		// 房间是否started
		if room.GameStage.IsLaterThanOrEqual(constants.STAGE_InGame) {
			c.WriteJSON(map[string]interface{}{
				"success": false,
				"error":   "房间已开始",
			})
			c.Close()
			return
		}
	}

	c.WriteJSON(map[string]interface{}{
		"success": true,
		"room_id": room.ID,
		"key":     _key,
	})

	// 服务用户连接
	room.HandleClientJoin(c)
}
