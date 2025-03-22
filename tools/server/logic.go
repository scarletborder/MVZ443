// 游戏逻辑检测器,每服务器loop发送完消息后就重置
package main

import "mvzserver/messages"

const MAXROWS = 6
const MAXCOLS = 9
const MAXCARDS = 8 // max cards allowed to plant per server loop in one grid

type GameLogic struct {
	// 本循环中将要放置的card
	cards [MAXROWS][MAXCOLS]bool // 每一个frame只能做一次操作
	msgs  []messages.MessageSend
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

func (g *GameLogic) PlantCard(col, row, id, level, uid int) {
	if (col < 0 || col >= MAXCOLS) || (row < 0 || row >= MAXROWS) {
		return
	}
	// 判断这个grid有没有做过操作
	isOk := !g.cards[row][col]

	if isOk {
		g.cards[row][col] = true
		g.msgs = append(g.msgs, messages.CardPlant{
			Type:  messages.MsgTypeCardPlant,
			Pid:   id,
			Level: level,
			Col:   col,
			Row:   row,
			UID:   uid,
		})
	}
}

func (g *GameLogic) RemoveCard(col, row, id, uid int) {
	if (col < 0 || col >= MAXCOLS) || (row < 0 || row >= MAXROWS) {
		return
	}

	// 这个grid有没有做过操作
	if g.cards[row][col] { // true=> 有操作
		return
	}
	g.msgs = append(g.msgs, messages.RemovePlant{
		Type: messages.MsgTypeRemovePlant,
		Pid:  id,
		Col:  col,
		Row:  row,
		UID:  uid,
	})
}

func (g *GameLogic) UseStarShards(col, row, id, uid int) {
	if (col < 0 || col >= MAXCOLS) || (row < 0 || row >= MAXROWS) {
		return
	}

	// 这个grid有没有做过操作
	if g.cards[row][col] { // true=> 有操作
		return
	}
	g.msgs = append(g.msgs, messages.UseStarShards{
		Type: messages.MsgTypeUseStarShards,
		Pid:  id,
		Col:  col,
		Row:  row,
		UID:  uid,
	})
}
