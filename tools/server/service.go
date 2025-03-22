package main

import "time"

// global

type RoomManager struct {
	rooms map[int]*Room
}

func NewRoomManager() *RoomManager {
	rm := &RoomManager{
		rooms: make(map[int]*Room),
	}
	go rm.startCleaner()
	return rm
}

func (rm *RoomManager) GetRoom(id int) *Room {
	return rm.rooms[id]
}

func (rm *RoomManager) GetNewRoomId() int {
	id := 0
	for {
		// 如果房间id已经存在,则继续寻找
		if rm.rooms[id] == nil {
			return id
		}
		id++
	}
}

func (rm *RoomManager) AddRoom(id int) *Room {
	room := NewRoom(id)
	rm.rooms[id] = room
	return room
}

func (rm *RoomManager) RemoveRoom(id int) {
	room := rm.rooms[id]
	if room != nil {
		room.Destroy()
		delete(rm.rooms, id)
	}
}

// 定时清理无人房间
func (rm *RoomManager) startCleaner() {
	ticker := time.NewTicker(1 * time.Minute) // 每分钟清理一次
	defer ticker.Stop()

	for range ticker.C {
		rm.Clean()
	}
}

func (rm *RoomManager) Clean() {
	for id, room := range rm.rooms {
		if room.GetPlayerCount() == 0 {
			room.Destroy()
			delete(rm.rooms, id)
		}
	}
}
