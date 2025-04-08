// encoder.go
package messages

import (
	"bytes"
	"encoding/binary"
	"errors"
)

// EncodeMessage 接收 MessageSend 接口的消息，返回二进制数据
func EncodeMessage(msg MessageSend) ([]byte, error) {
	buf := new(bytes.Buffer)
	// 写入消息类型
	if err := binary.Write(buf, binary.BigEndian, uint8(msg.GetType())); err != nil {
		return nil, err
	}

	switch m := msg.(type) {
	case RoomInfo:
		// RoomInfo 固定字段：roomID, lordID, myID, chapterId 均使用 uint16（2字节）
		if err := binary.Write(buf, binary.BigEndian, uint16(m.RoomID)); err != nil {
			return nil, err
		}
		if err := binary.Write(buf, binary.BigEndian, uint16(m.LordID)); err != nil {
			return nil, err
		}
		if err := binary.Write(buf, binary.BigEndian, uint16(m.MyID)); err != nil {
			return nil, err
		}
		if err := binary.Write(buf, binary.BigEndian, uint16(m.ChapterId)); err != nil {
			return nil, err
		}
		// 对于 peer 数组，先写入个数（uint8），然后逐个写入：
		peerCount := uint8(len(m.Peer))
		if err := binary.Write(buf, binary.BigEndian, peerCount); err != nil {
			return nil, err
		}
		for _, peer := range m.Peer {
			peerBytes := []byte(peer)
			// 假设每个地址长度不超过 255 字节，先写入长度（uint8），再写入内容
			if err := binary.Write(buf, binary.BigEndian, uint8(len(peerBytes))); err != nil {
				return nil, err
			}
			if _, err := buf.Write(peerBytes); err != nil {
				return nil, err
			}
		}
	case GameStart:
		// GameStart: seed (int32) + myID (uint16)
		if err := binary.Write(buf, binary.BigEndian, int32(m.Seed)); err != nil {
			return nil, err
		}
		if err := binary.Write(buf, binary.BigEndian, uint16(m.MyID)); err != nil {
			return nil, err
		}
	case CardPlant:
		// CardPlant: frameID(uint16), pid(uint16), level(uint8), col(uint8), row(uint8), uid(uint16)
		if err := binary.Write(buf, binary.BigEndian, uint16(m.FrameID)); err != nil {
			return nil, err
		}
		if err := binary.Write(buf, binary.BigEndian, uint16(m.Pid)); err != nil {
			return nil, err
		}
		if err := binary.Write(buf, binary.BigEndian, uint8(m.Level)); err != nil {
			return nil, err
		}
		if err := binary.Write(buf, binary.BigEndian, uint8(m.Col)); err != nil {
			return nil, err
		}
		if err := binary.Write(buf, binary.BigEndian, uint8(m.Row)); err != nil {
			return nil, err
		}
		if err := binary.Write(buf, binary.BigEndian, uint16(m.UID)); err != nil {
			return nil, err
		}
	case RemovePlant:
		// RemovePlant: frameID(uint16), pid(uint16), col(uint8), row(uint8), uid(uint16)
		if err := binary.Write(buf, binary.BigEndian, uint16(m.FrameID)); err != nil {
			return nil, err
		}
		if err := binary.Write(buf, binary.BigEndian, uint16(m.Pid)); err != nil {
			return nil, err
		}
		if err := binary.Write(buf, binary.BigEndian, uint8(m.Col)); err != nil {
			return nil, err
		}
		if err := binary.Write(buf, binary.BigEndian, uint8(m.Row)); err != nil {
			return nil, err
		}
		if err := binary.Write(buf, binary.BigEndian, uint16(m.UID)); err != nil {
			return nil, err
		}
	case UseStarShards:
		// UseStarShards: frameID(uint16), pid(uint16), col(uint8), row(uint8), uid(uint16)
		if err := binary.Write(buf, binary.BigEndian, uint16(m.FrameID)); err != nil {
			return nil, err
		}
		if err := binary.Write(buf, binary.BigEndian, uint16(m.Pid)); err != nil {
			return nil, err
		}
		if err := binary.Write(buf, binary.BigEndian, uint8(m.Col)); err != nil {
			return nil, err
		}
		if err := binary.Write(buf, binary.BigEndian, uint8(m.Row)); err != nil {
			return nil, err
		}
		if err := binary.Write(buf, binary.BigEndian, uint16(m.UID)); err != nil {
			return nil, err
		}
	case ChooseMap:
		// ChooseMap: chapterId (uint16)
		if err := binary.Write(buf, binary.BigEndian, uint16(m.ChapterId)); err != nil {
			return nil, err
		}
	case ErrorMessage:
		// ErrorMessage: 先写入字符串长度 (uint16) 再写入字符串内容
		messageBytes := []byte(m.Message)
		if err := binary.Write(buf, binary.BigEndian, uint16(len(messageBytes))); err != nil {
			return nil, err
		}
		if _, err := buf.Write(messageBytes); err != nil {
			return nil, err
		}
	default:
		return nil, errors.New("unsupported message type")
	}

	return buf.Bytes(), nil
}
