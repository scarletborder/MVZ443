package messages

// 定义接收消息的类型常量
const (
	MsgTypeRequestJoin      = 0x00 // 请求加入房间
	MsgTypeRequestChooseMap = 0x10 // 请求选择地图
	MsgTypeReady            = 0x01 // 加载完毕,游戏内的准备准备就绪
	MsgTypeRequestEndGame   = 0x20 // endgame

	MsgTypeRequestCardPlant   = 0x02 // 请求种植卡片
	MsgTypeRequestBlank       = 0x03 // 空白消息用于同步FrameID
	MsgTypeRequestRemovePlant = 0x04 // 请求移除植物
	MsgTypeRequestStarShards  = 0x08 // 请求使用星尘
)

// Message 接口用于通用处理，每个消息都需要实现 GetType 方法
type Message interface {
	GetType() int
}

// RequestJoin 消息：加入房间
type RequestJoin struct {
	Type   int `json:"type"`
	RoomID int `json:"roomID"`
}

func (m RequestJoin) GetType() int {
	return m.Type
}

// Ready 消息：客户端准备
type Ready struct {
	Type int `json:"type"`
	UID  int `json:"uid"` // 来源用户
}

func (m Ready) GetType() int {
	return m.Type
}

// RequestBlank 消息: 空白消息同步frameID
type RequestBlank struct {
	Type    int    `json:"type"`
	UID     int    `json:"uid"` // 来源用户
	FrameID uint16 `json:"frameId"`
}

func (m RequestBlank) GetType() int {
	return m.Type
}

// RequestCardPlant 消息：请求种植卡片
type RequestCardPlant struct {
	Type  int `json:"type"`
	Pid   int `json:"pid"`
	Level int `json:"level"`
	Col   int `json:"col"`
	Row   int `json:"row"`
	UID   int `json:"uid"` // 来源用户

	FrameID uint16 `json:"frameId"`
}

func (m RequestCardPlant) GetType() int {
	return m.Type
}

// RequestRemovePlant 消息：请求移除植物
type RequestRemovePlant struct {
	Type int `json:"type"`
	Pid  int `json:"pid"`
	Col  int `json:"col"`
	Row  int `json:"row"`
	UID  int `json:"uid"` // 来源用户

	FrameID uint16 `json:"frameId"`
}

func (m RequestRemovePlant) GetType() int {
	return m.Type
}

// RequestStarShards 消息：请求使用星尘
type RequestStarShards struct {
	Type int `json:"type"`
	Pid  int `json:"pid"`
	Col  int `json:"col"`
	Row  int `json:"row"`
	UID  int `json:"uid"` // 来源用户

	FrameID uint16 `json:"frameId"`
}

func (m RequestStarShards) GetType() int {
	return m.Type
}

type RequestChooseMap struct {
	Type      int `json:"type"`
	ChapterId int `json:"chapterId"`
}

func (m RequestChooseMap) GetType() int {
	return m.Type
}

type RequestStartGame struct {
	Type int `json:"type"`
}

func (m RequestStartGame) GetType() int {
	return m.Type
}
