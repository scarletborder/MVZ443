package handlers

import (
	"log"
	"mvzserver/constants"
	messages "mvzserver/messages/pb"
	roommanager "mvzserver/room-manager"
	"mvzserver/types"
	"mvzserver/utils"
	"runtime/debug"
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
	defer func() {
		if r := recover(); r != nil {
			log.Printf("处理玩家注册时捕获到 Panic: %v\n", r)
			log.Printf("堆栈信息:\n%s", string(debug.Stack()))
		}
	}()

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
		var payload = messages.ResponseJoinRoomFailed{}
		var resp = messages.LobbyResponse{
			Payload: &messages.LobbyResponse_JoinRoomFailed{
				JoinRoomFailed: &payload,
			},
		}
		if room.CheckKeyCorrect(_key) == false {
			payload.Message = "密钥错误"
			utils.WriteLobbyResponse(c, &resp)
			c.Close()
			return
		}

		// 房间存在,检查是否已满
		if room.GetPlayerCount() >= 2 {
			payload.Message = "房间已满"
			utils.WriteLobbyResponse(c, &resp)
			c.Close()
			return
		}

		// 房间是否进入准备阶段
		if room.GameStage.IsLaterThanOrEqual(constants.STAGE_Preparing) {
			payload.Message = "房间已开始"
			utils.WriteLobbyResponse(c, &resp)
			c.Close()
			return
		}
	}

	// 服务用户连接
	room.HandleClientJoin(c)
}
