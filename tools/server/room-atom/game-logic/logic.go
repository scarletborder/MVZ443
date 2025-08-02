// 游戏逻辑检测器,每服务器loop发送完消息后就重置
package gamelogic

import (
	"mvzserver/clients"
	messages "mvzserver/messages/pb"
)

type ClientCtx = clients.ClientCtx

const MAXROWS = 6
const MAXCOLS = 9
const MAXCARDS = 8 // max cards allowed to plant per server loop in one grid

// 游戏的纯逻辑
// 只和游戏状态无关,和房间,玩家等无关
// 目前的游戏不需要把玩家放在战局中,帧同步游戏只管理战局中植物这一物品的状态
// 所有副作用影响因为完全的帧编排,保证不会出现任何逻辑错误
// TCP+WS暂时不考虑校验(room-atom和client在发送自己的消息时候都要进行校验码)
type GameLogic struct {
	// 与房间进行通信管道
	operationChan chan<- *messages.InGameOperation

	// 本循环中将要放置的card
	cards [MAXROWS][MAXCOLS]bool // 每一个frame只能做一次操作
}

func NewGameLogic(operationChan chan<- *messages.InGameOperation) *GameLogic {
	return &GameLogic{
		operationChan: operationChan,
	}
}

func (g *GameLogic) Reset() {
	for i := 0; i < MAXROWS; i++ {
		for j := 0; j < MAXCOLS; j++ {
			g.cards[i][j] = false
		}
	}
	// 清空消息管道由服务器在每次tick广播后，自己清空chan
}
