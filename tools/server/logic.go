// 游戏逻辑检测器,每服务器loop发送完消息后就重置
package main

import "mvzserver/messages"

const MAXROWS = 6
const MAXCOLS = 9
const MAXCARDS = 8 // max cards allowed to plant per server loop in one grid

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
		if uc, ok := value.(*userCtx); ok {
			// 忽略错误处理，可根据实际需要扩展
			uc.WriteJSON(msgs)
		}
		return true
	})
}
