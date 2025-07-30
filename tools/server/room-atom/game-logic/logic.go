// 游戏逻辑检测器,每服务器loop发送完消息后就重置
package gamelogic

import (
	"mvzserver/messages"
	roomatom "mvzserver/room-atom"
)

type Room = roomatom.Room
type ClientCtx = roomatom.ClientCtx

const MAXROWS = 6
const MAXCOLS = 9
const MAXCARDS = 8 // max cards allowed to plant per server loop in one grid

// 游戏的纯逻辑
// 只和游戏状态无关,和房间,玩家等无关
// 目前的游戏不需要把玩家放在战局中,帧同步游戏只管理战局中植物这一物品的状态
// 所有副作用影响因为完全的帧编排,保证不会出现任何逻辑错误
// TODO: room-atom和client在发送自己的消息时候都要进行校验码
type GameLogic struct {
	// 本循环中将要放置的card
	cards [MAXROWS][MAXCOLS]bool // 每一个frame只能做一次操作
	msgs  [][]byte
}

func NewGameLogic() *GameLogic {
	return &GameLogic{}
}

func (g *GameLogic) Reset() {
	for i := 0; i < MAXROWS; i++ {
		for j := 0; j < MAXCOLS; j++ {
			g.cards[i][j] = false
		}
	}
	g.msgs = g.msgs[:0]
}

func (g *GameLogic) PlantCard(col, row, id, level, uid int, frameID uint16) {
	if col < 0 || col >= MAXCOLS || row < 0 || row >= MAXROWS {
		return
	}
	// 判断这个grid有没有做过操作
	if g.cards[row][col] { // true=> 有操作
		return
	}

	data, err := messages.EncodeMessage(messages.CardPlant{
		Type:    messages.MsgTypeCardPlant,
		Pid:     id,
		Level:   level,
		Col:     col,
		Row:     row,
		UID:     uid,
		FrameID: frameID,
	})
	if err != nil {
		return
	}

	g.cards[row][col] = true
	g.msgs = append(g.msgs, data)
}

func (g *GameLogic) RemoveCard(col, row, id, uid int, frameID uint16) {
	if col < 0 || col >= MAXCOLS || row < 0 || row >= MAXROWS {
		return
	}

	// 判断这个grid有没有做过操作
	if g.cards[row][col] { // true=> 有操作
		return
	}

	data, err := messages.EncodeMessage(messages.RemovePlant{
		Type:    messages.MsgTypeRemovePlant,
		Pid:     id,
		Col:     col,
		Row:     row,
		UID:     uid,
		FrameID: frameID,
	})
	if err != nil {
		return
	}

	g.cards[row][col] = true
	g.msgs = append(g.msgs, data)
}

func (g *GameLogic) UseStarShards(col, row, id, uid int, frameID uint16) {
	if col < 0 || col >= MAXCOLS || row < 0 || row >= MAXROWS {
		return
	}

	// 判断这个grid有没有做过操作
	if g.cards[row][col] { // true=> 有操作
		return
	}
	data, err := messages.EncodeMessage(messages.UseStarShards{
		Type:    messages.MsgTypeUseStarShards,
		Pid:     id,
		Col:     col,
		Row:     row,
		UID:     uid,
		FrameID: frameID,
	})
	if err != nil {
		return
	}

	g.cards[row][col] = true
	g.msgs = append(g.msgs, data)
}

// TODO: 不应该让Logic调用room,
// logic在处理消息的时候,如果遇到类似游戏结束(胜利/失败)的信号后,
// 应当让游戏报告立刻返回, 而不是调用广播
// 永远是 room -> logic -> room -> clients 的流
func (g *GameLogic) BroadGameEnd(room *Room, GameResult uint16) {
	// 加急直接发送
	data, err := messages.EncodeMessage(messages.GameEnd{
		Type:       messages.MsgEndGame,
		GameResult: GameResult,
	})
	if err != nil {
		return
	}

	var msgs = [][]byte{data}
	// 遍历所有客户端，使用sync.Map.Range来确保并发安全
	room.CtxManager.Clients.Range(func(key, value interface{}) bool {
		if uc, ok := value.(*ClientCtx); ok {
			// 忽略错误处理，可根据实际需要扩展
			uc.WriteJSON(msgs)
		}
		return true
	})
}
