// api 信息定义
package types

import "mvzserver/constants"

type RoomsInfo struct {
	RoomID      int             `json:"room_id"`
	NeedKey     bool            `json:"need_key"`
	PlayerCount int             `json:"player_count"`
	GameState   constants.Stage `json:"game_state"` // 游戏状态

	// Deprecated: 是否开始游戏
	// GameStarted bool `json:"game_started"`
}
