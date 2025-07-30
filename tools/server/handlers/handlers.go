package handlers

import roommanager "mvzserver/room-manager"

// 处理器结构体
// 管理依赖
type ServerHandler struct {
	RoomMnager *roommanager.RoomManager
}

func NewServerHandler(roomMnager *roommanager.RoomManager) *ServerHandler {
	return &ServerHandler{RoomMnager: roomMnager}
}

// 利用 ServerHandler
