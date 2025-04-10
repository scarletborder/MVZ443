package main

import (
	"sync"
	"time"
)

// RoomManager 管理所有房间
type RoomManager struct {
	rooms sync.Map // key 为 int 类型，value 为 *Room
}

func NewRoomManager() *RoomManager {
	rm := &RoomManager{}
	go rm.startCleaner()
	return rm
}

// GetRoom 根据 id 获取房间
func (rm *RoomManager) GetRoom(id int) *Room {
	if room, ok := rm.rooms.Load(id); ok {
		if r, ok := room.(*Room); ok {
			return r
		}
	}
	return nil
}

// GetNewRoomId 寻找一个未使用的房间id
func (rm *RoomManager) GetNewRoomId() int {
	id := 0
	for {
		// 尝试从 sync.Map 中 Load 数据
		if _, ok := rm.rooms.Load(id); !ok {
			return id
		}
		id++
	}
}

// AddRoom 创建一个新的房间并添加到管理器中
func (rm *RoomManager) AddRoom(id int, key string) *Room {
	room := NewRoom(id)
	room.key = key
	rm.rooms.Store(id, room)
	return room
}

// RemoveRoom 根据 id 移除房间
func (rm *RoomManager) RemoveRoom(id int) {
	if room, ok := rm.rooms.Load(id); ok {
		if r, ok := room.(*Room); ok {
			r.Destroy()
		}
		rm.rooms.Delete(id)
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

// Clean 遍历所有房间，清理人数为 0 的房间
func (rm *RoomManager) Clean() {
	rm.rooms.Range(func(key, value interface{}) bool {
		if id, ok := key.(int); ok {
			if room, ok := value.(*Room); ok {
				if room.GetPlayerCount() == 0 {
					room.Destroy()
					rm.rooms.Delete(id)
				}

				// 检查是否超过最大空闲时间
				if time.Since(room.LastActiveTime) > 5*time.Minute {
					room.Destroy()
					rm.rooms.Delete(id)
				}
			}
		}
		return true
	})
}
