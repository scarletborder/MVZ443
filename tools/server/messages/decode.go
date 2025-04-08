package messages

import (
	"encoding/binary"
	"errors"
)

func DecodeBinaryMessage(data []byte) (int, interface{}, error) {
	if len(data) < 8 {
		return -1, nil, errors.New("data too short")
	}

	msgType := int(data[0])
	uid := int(binary.BigEndian.Uint16(data[1:3]))

	switch msgType {
	case MsgTypeBlank:
		return msgType, RequestBlank{
			Type:    msgType,
			UID:     uid,
			FrameID: (binary.BigEndian.Uint16(data[3:5])),
		}, nil
	case MsgTypeRequestCardPlant:
		return msgType, RequestCardPlant{
			Type:    msgType,
			UID:     uid,
			Pid:     int(binary.BigEndian.Uint16(data[3:5])),
			Level:   int(data[5]),
			Col:     int(data[6]),
			Row:     int(data[7]),
			FrameID: (binary.BigEndian.Uint16(data[8:10])),
		}, nil

	case MsgTypeRequestRemovePlant:
		return msgType, RequestRemovePlant{
			Type:    msgType,
			UID:     uid,
			Pid:     int(binary.BigEndian.Uint16(data[3:5])),
			Col:     int(data[6]),
			Row:     int(data[7]),
			FrameID: (binary.BigEndian.Uint16(data[8:10])),
		}, nil

	case MsgTypeRequestStarShards:
		return msgType, RequestStarShards{
			Type:    msgType,
			UID:     uid,
			Pid:     int(binary.BigEndian.Uint16(data[3:5])),
			Col:     int(data[6]),
			Row:     int(data[7]),
			FrameID: (binary.BigEndian.Uint16(data[8:10])),
		}, nil

	case MsgTypeReady:
		return msgType, Ready{
			Type: msgType,
			UID:  uid,
		}, nil

	case MsgTypeRequestChooseMap:
		return msgType, RequestChooseMap{
			Type:      msgType,
			ChapterId: int(binary.BigEndian.Uint32(data[3:7])),
		}, nil

	case MsgTypeRequestEndGame:
		return msgType, nil, nil
	}

	return -1, nil, errors.New("unknown message type")
}
