// 游戏逻辑检测器,每服务器loop发送完消息后就重置
package gamelogic

import (
	messages "mvzserver/messages/pb"
)

const MAXROWS = 6
const MAXCOLS = 9
const MAXCARDS = 8 // max cards allowed to plant per server loop in one grid

type frameGrid [MAXROWS][MAXCOLS]bool

// 游戏的纯逻辑
// 只和游戏状态无关,和房间,玩家等无关
// 目前的游戏不需要把玩家放在战局中,帧同步游戏只管理战局中植物这一物品的状态
// 所有副作用影响因为完全的帧编排,保证不会出现任何逻辑错误
// TCP+WS暂时不考虑校验(room-atom和client在发送自己的消息时候都要进行校验码)
type GameLogic struct {
	// 每一逻辑帧中的格子占用情况
	cards map[uint32]*frameGrid
}

func NewGameLogic(_ chan<- *messages.InGameOperation) *GameLogic {
	return &GameLogic{
		cards: make(map[uint32]*frameGrid),
	}
}

func (g *GameLogic) Reset() {
	g.cards = make(map[uint32]*frameGrid)
}

func (g *GameLogic) ReleaseFrame(frameID uint32) {
	delete(g.cards, frameID)
}

func (g *GameLogic) getFrameGrid(frameID uint32) *frameGrid {
	grid, ok := g.cards[frameID]
	if ok {
		return grid
	}

	grid = &frameGrid{}
	g.cards[frameID] = grid
	return grid
}
