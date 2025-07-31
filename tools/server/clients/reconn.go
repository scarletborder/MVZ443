package clients

import (
	"fmt"
	"mvzserver/utils"

	"github.com/gofiber/websocket/v2"
)

type ReconnectRequest struct {
	Conn              *websocket.Conn
	PlayerID          string // 玩家ID
	ReconnectionToken string // 重连令牌
}

type ReconnGen struct {
	// 密钥字符串
	AESKEY string // 用于加密的密钥
}

func (r ReconnGen) MakeReconnectionToken(playerID int, roomID int, key string) (string, error) {
	// 使用对称加密算法生成重连令牌
	original := fmt.Sprintf("%d:%d:%s", playerID, roomID, key)
	return utils.Encrypt(original, r.AESKEY)

}

func (r ReconnGen) ParseReconnectionToken(token string) (playerID int, roomID int, key string, err error) {
	// 解密
	decoded, err := utils.Decrypt(token, r.AESKEY)
	if err != nil {
		return 0, 0, "", err
	}

	// 解析
	_, err = fmt.Sscanf(decoded, "%d:%d:%s", &playerID, &roomID, &key)
	if err != nil {
		return 0, 0, "", err
	}

	return playerID, roomID, key, nil
}
