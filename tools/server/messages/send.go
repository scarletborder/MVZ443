package messages

// 定义发送消息的类型常量
const (
	MsgTypeRoomInfo = 0x00 // 房间信息
	MsgChooseMap    = 0x10 // 选择地图
	MsgTypeError    = 0xF0 // 错误

	MsgTypeGameStart     = 0x01 // 游戏开始
	MsgTypeCardPlant     = 0x02 // 种植卡片
	MsgTypeBlank         = 0x03 // 空白消息,只用于同步frameID
	MsgTypeRemovePlant   = 0x04 // 移除植物
	MsgTypeUseStarShards = 0x08 // 使用星尘
)

// MessageSend 接口用于服务器发送的消息
type MessageSend interface {
	GetType() int
}

// RoomInfo 消息：服务器告知房间信息
type RoomInfo struct {
	Type      int      `json:"type"`
	RoomID    int      `json:"roomID"`    // 目前无用
	LordID    int      `json:"lordID"`    // 房主ID
	MyID      int      `json:"myID"`      // 用户ID
	ChapterId int      `json:"chapterId"` // 房主选择的地图
	Peer      []string `json:"peer"`      // 房间内其他用户地址
}

func (m RoomInfo) GetType() int {
	return m.Type
}

// GameStart 消息：游戏开始
type GameStart struct {
	Type int `json:"type"`
	Seed int `json:"seed"`
	MyID int `json:"myID"`
}

func (m GameStart) GetType() int {
	return m.Type
}

// CardPlant 消息：种植卡片
type CardPlant struct {
	Type    int    `json:"type"`
	FrameID uint16 `json:"frameId"`
	Pid     int    `json:"pid"`
	Level   int    `json:"level"`
	Col     int    `json:"col"`
	Row     int    `json:"row"`
	UID     int    `json:"uid"` // 来源用户
}

func (m CardPlant) GetType() int {
	return m.Type
}

// RemovePlant 消息：移除植物
type RemovePlant struct {
	Type    int    `json:"type"`
	FrameID uint16 `json:"frameId"`
	Pid     int    `json:"pid"`
	Col     int    `json:"col"`
	Row     int    `json:"row"`
	UID     int    `json:"uid"` // 来源用户
}

func (m RemovePlant) GetType() int {
	return m.Type
}

// UseStarShards 消息：使用星尘
type UseStarShards struct {
	Type    int    `json:"type"`
	FrameID uint16 `json:"frameId"`
	Pid     int    `json:"pid"`
	Col     int    `json:"col"`
	Row     int    `json:"row"`
	UID     int    `json:"uid"` // 来源用户
}

func (m UseStarShards) GetType() int {
	return m.Type
}

// Blank
type BlankMsg struct {
	Type    int    `json:"type"`
	FrameID uint16 `json:"frameId"`
}

func (m BlankMsg) GetType() int {
	return m.Type
}

// ChooseMap 消息：选择地图
type ChooseMap struct {
	Type      int `json:"type"`
	ChapterId int `json:"chapterId"`
}

func (m ChooseMap) GetType() int {
	return m.Type
}

// ErrorMessage 消息：服务器错误信息
type ErrorMessage struct {
	Type    int    `json:"type"`
	Message string `json:"message"`
}

func (m ErrorMessage) GetType() int {
	return m.Type
}
