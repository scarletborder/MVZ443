// request.go
package messages

import (
	"bytes"
	"encoding/binary"
	"errors"
)

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

// RequestMessage 接口用于通用处理，每个消息都需要实现 GetType 方法
type RequestMessage interface {
	GetType() int
}

// RequestJoin 消息：加入房间 (此消息格式未在二进制解码中定义，因此不实现 Encode/Decode)
type RequestJoin struct {
	Type   int `json:"type"`
	RoomID int `json:"roomID"`
}

func (m RequestJoin) GetType() int { return m.Type }

// Ready 消息：客户端准备
type Ready struct {
	Type int `json:"type"`
	UID  int `json:"uid"` // 来源用户
}

func (m Ready) GetType() int { return MsgTypeReady }
func (m *Ready) Decode(data []byte) error {
	if len(data) < 3 {
		return errors.New("data too short for Ready message")
	}
	m.Type = int(data[0])
	m.UID = int(binary.BigEndian.Uint16(data[1:3]))
	return nil
}
func (m *Ready) Encode() ([]byte, error) {
	buf := new(bytes.Buffer)
	buf.WriteByte(byte(m.GetType()))
	if err := binary.Write(buf, binary.BigEndian, uint16(m.UID)); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// RequestBlank 消息: 空白消息同步frameID
type RequestBlank struct {
	Type    int    `json:"type"`
	UID     int    `json:"uid"` // 来源用户
	FrameID uint16 `json:"frameId"`
}

func (m RequestBlank) GetType() int { return MsgTypeRequestBlank }
func (m *RequestBlank) Decode(data []byte) error {
	if len(data) < 5 {
		return errors.New("data too short for RequestBlank message")
	}
	m.Type = int(data[0])
	m.UID = int(binary.BigEndian.Uint16(data[1:3]))
	m.FrameID = binary.BigEndian.Uint16(data[3:5])
	return nil
}
func (m *RequestBlank) Encode() ([]byte, error) {
	buf := new(bytes.Buffer)
	buf.WriteByte(byte(m.GetType()))
	if err := binary.Write(buf, binary.BigEndian, uint16(m.UID)); err != nil {
		return nil, err
	}
	if err := binary.Write(buf, binary.BigEndian, m.FrameID); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// RequestCardPlant 消息：请求种植卡片
type RequestCardPlant struct {
	Type    int    `json:"type"`
	Pid     int    `json:"pid"`
	Level   int    `json:"level"`
	Col     int    `json:"col"`
	Row     int    `json:"row"`
	UID     int    `json:"uid"` // 来源用户
	FrameID uint16 `json:"frameId"`
}

func (m RequestCardPlant) GetType() int { return MsgTypeRequestCardPlant }
func (m *RequestCardPlant) Decode(data []byte) error {
	if len(data) < 10 {
		return errors.New("data too short for RequestCardPlant message")
	}
	m.Type = int(data[0])
	m.UID = int(binary.BigEndian.Uint16(data[1:3]))
	m.Pid = int(binary.BigEndian.Uint16(data[3:5]))
	m.Level = int(data[5])
	m.Col = int(data[6])
	m.Row = int(data[7])
	m.FrameID = binary.BigEndian.Uint16(data[8:10])
	return nil
}
func (m *RequestCardPlant) Encode() ([]byte, error) {
	buf := new(bytes.Buffer)
	buf.WriteByte(byte(m.GetType()))
	binary.Write(buf, binary.BigEndian, uint16(m.UID))
	binary.Write(buf, binary.BigEndian, uint16(m.Pid))
	buf.WriteByte(byte(m.Level))
	buf.WriteByte(byte(m.Col))
	buf.WriteByte(byte(m.Row))
	binary.Write(buf, binary.BigEndian, m.FrameID)
	return buf.Bytes(), nil // 在bytes.Buffer上的写入操作通常不会返回错误
}

// RequestRemovePlant 消息：请求移除植物
type RequestRemovePlant struct {
	Type    int    `json:"type"`
	Pid     int    `json:"pid"`
	Col     int    `json:"col"`
	Row     int    `json:"row"`
	UID     int    `json:"uid"` // 来源用户
	FrameID uint16 `json:"frameId"`
}

func (m RequestRemovePlant) GetType() int { return MsgTypeRequestRemovePlant }
func (m *RequestRemovePlant) Decode(data []byte) error {
	if len(data) < 9 {
		return errors.New("data too short for RequestRemovePlant message")
	}
	m.Type = int(data[0])
	m.UID = int(binary.BigEndian.Uint16(data[1:3]))
	m.Pid = int(binary.BigEndian.Uint16(data[3:5]))
	m.Col = int(data[6])
	m.Row = int(data[7])
	m.FrameID = binary.BigEndian.Uint16(data[8:10])
	return nil
}
func (m *RequestRemovePlant) Encode() ([]byte, error) {
	buf := new(bytes.Buffer)
	buf.WriteByte(byte(m.GetType()))
	binary.Write(buf, binary.BigEndian, uint16(m.UID))
	binary.Write(buf, binary.BigEndian, uint16(m.Pid))
	buf.WriteByte(byte(m.Col))
	buf.WriteByte(byte(m.Row))
	binary.Write(buf, binary.BigEndian, m.FrameID)
	return buf.Bytes(), nil
}

// RequestStarShards 消息：请求使用星尘
type RequestStarShards struct {
	Type    int    `json:"type"`
	Pid     int    `json:"pid"`
	Col     int    `json:"col"`
	Row     int    `json:"row"`
	UID     int    `json:"uid"` // 来源用户
	FrameID uint16 `json:"frameId"`
}

func (m RequestStarShards) GetType() int { return MsgTypeRequestStarShards }
func (m *RequestStarShards) Decode(data []byte) error {
	if len(data) < 9 {
		return errors.New("data too short for RequestStarShards message")
	}
	m.Type = int(data[0])
	m.UID = int(binary.BigEndian.Uint16(data[1:3]))
	m.Pid = int(binary.BigEndian.Uint16(data[3:5]))
	m.Col = int(data[6])
	m.Row = int(data[7])
	m.FrameID = binary.BigEndian.Uint16(data[8:10])
	return nil
}
func (m *RequestStarShards) Encode() ([]byte, error) {
	buf := new(bytes.Buffer)
	buf.WriteByte(byte(m.GetType()))
	binary.Write(buf, binary.BigEndian, uint16(m.UID))
	binary.Write(buf, binary.BigEndian, uint16(m.Pid))
	buf.WriteByte(byte(m.Col))
	buf.WriteByte(byte(m.Row))
	binary.Write(buf, binary.BigEndian, m.FrameID)
	return buf.Bytes(), nil
}

type RequestChooseMap struct {
	Type      int `json:"type"`
	ChapterId int `json:"chapterId"`
}

func (m RequestChooseMap) GetType() int { return MsgTypeRequestChooseMap }
func (m *RequestChooseMap) Decode(data []byte) error {
	if len(data) < 7 { // Note: original implementation was inconsistent and did not include UID. We respect that.
		return errors.New("data too short for RequestChooseMap message")
	}
	m.Type = int(data[0])
	// data[1:3] is skipped to match original decoding logic
	m.ChapterId = int(binary.BigEndian.Uint32(data[3:7]))
	return nil
}
func (m *RequestChooseMap) Encode() ([]byte, error) {
	buf := new(bytes.Buffer)
	buf.WriteByte(byte(m.GetType()))
	// To match the inconsistent decoding, we add two bytes of padding.
	if err := binary.Write(buf, binary.BigEndian, uint16(0)); err != nil {
		return nil, err
	}
	if err := binary.Write(buf, binary.BigEndian, uint32(m.ChapterId)); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

type RequestStartGame struct {
	Type int `json:"type"`
}

func (m RequestStartGame) GetType() int { return m.Type }

type RequestEndGame struct {
	Type       int    `json:"type"`
	GameResult uint16 `json:"gameResult"`
}

func (m RequestEndGame) GetType() int { return MsgTypeRequestEndGame }
func (m *RequestEndGame) Decode(data []byte) error {
	if len(data) < 5 { // Note: original implementation was inconsistent and did not include UID. We respect that.
		return errors.New("data too short for RequestEndGame message")
	}
	m.Type = int(data[0])
	// data[1:3] is skipped
	m.GameResult = binary.BigEndian.Uint16(data[3:5])
	return nil
}
func (m *RequestEndGame) Encode() ([]byte, error) {
	buf := new(bytes.Buffer)
	buf.WriteByte(byte(m.GetType()))
	// To match the inconsistent decoding, we add two bytes of padding.
	if err := binary.Write(buf, binary.BigEndian, uint16(0)); err != nil {
		return nil, err
	}
	if err := binary.Write(buf, binary.BigEndian, m.GameResult); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
