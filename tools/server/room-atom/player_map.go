package roomatom

import (
	"mvzserver/clients"
	"sync"
)

// PlayerMap 封装 sync.Map，强制 key 为 int，value 为 *Player
type PlayerMap struct {
	m sync.Map
}

func (pm *PlayerMap) Store(key int, value *clients.Player) {
	pm.m.Store(key, value)
}

func (pm *PlayerMap) Load(key int) (*clients.Player, bool) {
	v, ok := pm.m.Load(key)
	if !ok {
		return nil, false
	}
	p, ok := v.(*clients.Player)
	return p, ok
}

func (pm *PlayerMap) Delete(key int) {
	pm.m.Delete(key)
}

func (pm *PlayerMap) Range(f func(key int, value *clients.Player) bool) {
	pm.m.Range(func(k, v interface{}) bool {
		ki, ok1 := k.(int)
		vp, ok2 := v.(*clients.Player)
		if !ok1 || !ok2 {
			return true
		}
		return f(ki, vp)
	})
}

// 返回玩家数量
func (pm *PlayerMap) Len() int {
	count := 0
	pm.m.Range(func(_, _ interface{}) bool {
		count++
		return true
	})
	return count
}
