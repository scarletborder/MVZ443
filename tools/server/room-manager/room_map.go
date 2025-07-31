package roommanager

import "sync"

// RoomMap 封装 sync.Map，强制 key 为 int，value 为 *Room
type RoomMap struct {
	m sync.Map
}

func (rm *RoomMap) Store(key int, value *Room) {
	rm.m.Store(key, value)
}

func (rm *RoomMap) Load(key int) (*Room, bool) {
	v, ok := rm.m.Load(key)
	if !ok {
		return nil, false
	}
	r, ok := v.(*Room)
	return r, ok
}

func (rm *RoomMap) Delete(key int) {
	rm.m.Delete(key)
}

func (rm *RoomMap) Range(f func(key int, value *Room) bool) {
	rm.m.Range(func(k, v interface{}) bool {
		ki, ok1 := k.(int)
		vr, ok2 := v.(*Room)
		if !ok1 || !ok2 {
			return true
		}
		return f(ki, vr)
	})
}

// Len 返回房间数量
func (rm *RoomMap) Len() int {
	count := 0
	rm.m.Range(func(_, _ interface{}) bool {
		count++
		return true
	})
	return count
}
