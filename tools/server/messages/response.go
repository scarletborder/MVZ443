// response.go
package messages

import (
	"bytes"
	"encoding/binary"
	"errors"
	"io"
)

// 定义发送消息的类型常量
const (
	MsgTypeRoomInfo = 0x00 // 房间信息
	MsgChooseMap    = 0x10 // 选择地图
	MsgTypeError    = 0xF0 // 错误
	MsgEndGame      = 0x20 // endgame

	MsgTypeGameStart     = 0x01 // 游戏开始
	MsgTypeCardPlant     = 0x02 // 种植卡片
	MsgTypeBlank         = 0x03 // 空白消息,只用于同步frameID
	MsgTypeRemovePlant   = 0x04 // 移除植物
	MsgTypeUseStarShards = 0x08 // 使用星尘
)

// ResponseMessage 接口用于服务器发送的消息
type ResponseMessage interface {
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

func (m RoomInfo) GetType() int { return MsgTypeRoomInfo }
func (m *RoomInfo) Encode() ([]byte, error) {
	buf := new(bytes.Buffer)
	buf.WriteByte(byte(m.GetType()))
	binary.Write(buf, binary.BigEndian, uint16(m.RoomID))
	binary.Write(buf, binary.BigEndian, uint16(m.LordID))
	binary.Write(buf, binary.BigEndian, uint16(m.MyID))
	binary.Write(buf, binary.BigEndian, uint16(m.ChapterId))

	peerCount := uint8(len(m.Peer))
	buf.WriteByte(peerCount)
	for _, peer := range m.Peer {
		peerBytes := []byte(peer)
		buf.WriteByte(uint8(len(peerBytes)))
		buf.Write(peerBytes)
	}
	return buf.Bytes(), nil
}
func (m *RoomInfo) Decode(data []byte) error {
	reader := bytes.NewReader(data)
	var msgType uint8
	if err := binary.Read(reader, binary.BigEndian, &msgType); err != nil {
		return err
	}
	m.Type = int(msgType)

	var roomID, lordID, myID, chapterId uint16
	binary.Read(reader, binary.BigEndian, &roomID)
	binary.Read(reader, binary.BigEndian, &lordID)
	binary.Read(reader, binary.BigEndian, &myID)
	binary.Read(reader, binary.BigEndian, &chapterId)
	m.RoomID, m.LordID, m.MyID, m.ChapterId = int(roomID), int(lordID), int(myID), int(chapterId)

	var peerCount uint8
	if err := binary.Read(reader, binary.BigEndian, &peerCount); err != nil {
		return err
	}
	m.Peer = make([]string, peerCount)
	for i := 0; i < int(peerCount); i++ {
		var peerLen uint8
		if err := binary.Read(reader, binary.BigEndian, &peerLen); err != nil {
			return err
		}
		peerBytes := make([]byte, peerLen)
		if _, err := io.ReadFull(reader, peerBytes); err != nil {
			return err
		}
		m.Peer[i] = string(peerBytes)
	}
	return nil
}

// GameStart 消息：游戏开始
type GameStart struct {
	Type int `json:"type"`
	Seed int `json:"seed"`
	MyID int `json:"myID"`
}

func (m GameStart) GetType() int { return MsgTypeGameStart }
func (m *GameStart) Encode() ([]byte, error) {
	buf := new(bytes.Buffer)
	buf.WriteByte(byte(m.GetType()))
	binary.Write(buf, binary.BigEndian, int32(m.Seed))
	binary.Write(buf, binary.BigEndian, uint16(m.MyID))
	return buf.Bytes(), nil
}
func (m *GameStart) Decode(data []byte) error {
	if len(data) < 7 {
		return errors.New("data too short for GameStart message")
	}
	reader := bytes.NewReader(data)
	var msgType uint8
	binary.Read(reader, binary.BigEndian, &msgType)
	m.Type = int(msgType)

	var seed int32
	var myID uint16
	binary.Read(reader, binary.BigEndian, &seed)
	binary.Read(reader, binary.BigEndian, &myID)
	m.Seed = int(seed)
	m.MyID = int(myID)
	return nil
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

func (m CardPlant) GetType() int { return MsgTypeCardPlant }
func (m *CardPlant) Encode() ([]byte, error) {
	buf := new(bytes.Buffer)
	buf.WriteByte(byte(m.GetType()))
	binary.Write(buf, binary.BigEndian, m.FrameID)
	binary.Write(buf, binary.BigEndian, uint16(m.Pid))
	buf.WriteByte(byte(m.Level))
	buf.WriteByte(byte(m.Col))
	buf.WriteByte(byte(m.Row))
	binary.Write(buf, binary.BigEndian, uint16(m.UID))
	return buf.Bytes(), nil
}
func (m *CardPlant) Decode(data []byte) error {
	if len(data) < 10 {
		return errors.New("data too short for CardPlant message")
	}
	m.Type = int(data[0])
	m.FrameID = binary.BigEndian.Uint16(data[1:3])
	m.Pid = int(binary.BigEndian.Uint16(data[3:5]))
	m.Level = int(data[5])
	m.Col = int(data[6])
	m.Row = int(data[7])
	m.UID = int(binary.BigEndian.Uint16(data[8:10]))
	return nil
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

func (m RemovePlant) GetType() int { return MsgTypeRemovePlant }
func (m *RemovePlant) Encode() ([]byte, error) {
	buf := new(bytes.Buffer)
	buf.WriteByte(byte(m.GetType()))
	binary.Write(buf, binary.BigEndian, m.FrameID)
	binary.Write(buf, binary.BigEndian, uint16(m.Pid))
	buf.WriteByte(byte(m.Col))
	buf.WriteByte(byte(m.Row))
	binary.Write(buf, binary.BigEndian, uint16(m.UID))
	return buf.Bytes(), nil
}
func (m *RemovePlant) Decode(data []byte) error {
	if len(data) < 9 {
		return errors.New("data too short for RemovePlant message")
	}
	m.Type = int(data[0])
	m.FrameID = binary.BigEndian.Uint16(data[1:3])
	m.Pid = int(binary.BigEndian.Uint16(data[3:5]))
	m.Col = int(data[5])
	m.Row = int(data[6])
	m.UID = int(binary.BigEndian.Uint16(data[7:9]))
	return nil
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

func (m UseStarShards) GetType() int { return MsgTypeUseStarShards }
func (m *UseStarShards) Encode() ([]byte, error) {
	buf := new(bytes.Buffer)
	buf.WriteByte(byte(m.GetType()))
	binary.Write(buf, binary.BigEndian, m.FrameID)
	binary.Write(buf, binary.BigEndian, uint16(m.Pid))
	buf.WriteByte(byte(m.Col))
	buf.WriteByte(byte(m.Row))
	binary.Write(buf, binary.BigEndian, uint16(m.UID))
	return buf.Bytes(), nil
}
func (m *UseStarShards) Decode(data []byte) error {
	if len(data) < 9 {
		return errors.New("data too short for UseStarShards message")
	}
	m.Type = int(data[0])
	m.FrameID = binary.BigEndian.Uint16(data[1:3])
	m.Pid = int(binary.BigEndian.Uint16(data[3:5]))
	m.Col = int(data[5])
	m.Row = int(data[6])
	m.UID = int(binary.BigEndian.Uint16(data[7:9]))
	return nil
}

// BlankMsg
type BlankMsg struct {
	Type    int    `json:"type"`
	FrameID uint16 `json:"frameId"`
}

func (m BlankMsg) GetType() int { return MsgTypeBlank }
func (m *BlankMsg) Encode() ([]byte, error) {
	buf := new(bytes.Buffer)
	buf.WriteByte(byte(m.GetType()))
	binary.Write(buf, binary.BigEndian, m.FrameID)
	return buf.Bytes(), nil
}
func (m *BlankMsg) Decode(data []byte) error {
	if len(data) < 3 {
		return errors.New("data too short for BlankMsg message")
	}
	m.Type = int(data[0])
	m.FrameID = binary.BigEndian.Uint16(data[1:3])
	return nil
}

// ChooseMap 消息：选择地图
type ChooseMap struct {
	Type      int `json:"type"`
	ChapterId int `json:"chapterId"`
}

func (m ChooseMap) GetType() int { return MsgChooseMap }
func (m *ChooseMap) Encode() ([]byte, error) {
	buf := new(bytes.Buffer)
	buf.WriteByte(byte(m.GetType()))
	binary.Write(buf, binary.BigEndian, uint16(m.ChapterId))
	return buf.Bytes(), nil
}
func (m *ChooseMap) Decode(data []byte) error {
	if len(data) < 3 {
		return errors.New("data too short for ChooseMap message")
	}
	m.Type = int(data[0])
	m.ChapterId = int(binary.BigEndian.Uint16(data[1:3]))
	return nil
}

// GameEnd 消息: 游戏结束
type GameEnd struct {
	Type       int    `json:"type"`
	GameResult uint16 `json:"gameResult"` // 游戏结果 0:失败 1:胜利
}

func (m GameEnd) GetType() int { return MsgEndGame }
func (m *GameEnd) Encode() ([]byte, error) {
	buf := new(bytes.Buffer)
	buf.WriteByte(byte(m.GetType()))
	binary.Write(buf, binary.BigEndian, m.GameResult)
	return buf.Bytes(), nil
}
func (m *GameEnd) Decode(data []byte) error {
	if len(data) < 3 {
		return errors.New("data too short for GameEnd message")
	}
	m.Type = int(data[0])
	m.GameResult = binary.BigEndian.Uint16(data[1:3])
	return nil
}

// ErrorMessage 消息：服务器错误信息
type ErrorMessage struct {
	Type    int    `json:"type"`
	Message string `json:"message"`
}

func (m ErrorMessage) GetType() int { return MsgTypeError }
func (m *ErrorMessage) Encode() ([]byte, error) {
	buf := new(bytes.Buffer)
	buf.WriteByte(byte(m.GetType()))
	messageBytes := []byte(m.Message)
	binary.Write(buf, binary.BigEndian, uint16(len(messageBytes)))
	buf.Write(messageBytes)
	return buf.Bytes(), nil
}
func (m *ErrorMessage) Decode(data []byte) error {
	if len(data) < 3 { // Type(1) + Length(2)
		return errors.New("data too short for ErrorMessage header")
	}
	reader := bytes.NewReader(data)
	var msgType uint8
	binary.Read(reader, binary.BigEndian, &msgType)
	m.Type = int(msgType)

	var msgLen uint16
	if err := binary.Read(reader, binary.BigEndian, &msgLen); err != nil {
		return err
	}
	if reader.Len() < int(msgLen) {
		return errors.New("data too short for ErrorMessage body")
	}
	msgBytes := make([]byte, msgLen)
	if _, err := io.ReadFull(reader, msgBytes); err != nil {
		return err
	}
	m.Message = string(msgBytes)
	return nil
}
