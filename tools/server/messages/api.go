package messages

type RoomsInfo struct {
	RoomID      int  `json:"room_id"`
	NeedKey     bool `json:"need_key"`
	PlayerCount int  `json:"player_count"`
	GameStarted bool `json:"game_started"`
}
