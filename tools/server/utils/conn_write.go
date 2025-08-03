package utils

import (
	messages "mvzserver/messages/pb"

	"github.com/gofiber/websocket/v2"
	"google.golang.org/protobuf/proto"
)

// conn 写 LobbyResponse
func WriteLobbyResponse(conn *websocket.Conn, response *messages.LobbyResponse) error {
	data, err := proto.Marshal(response)
	if err != nil {
		return err
	}
	return conn.WriteMessage(websocket.BinaryMessage, data)
}
