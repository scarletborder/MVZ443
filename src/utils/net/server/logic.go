// 游戏逻辑检测器,每服务器loop发送完消息后就重置
package main

import "mvzserver/messages"

const MAXROWS = 6
const MAXCOLS = 9
const MAXCARDS = 8 // max cards allowed to plant per server loop in one grid

type GameLogic struct {
	// 本循环中将要放置的card
	cards [MAXROWS][MAXCOLS][]int // int-id
	msgs  []messages.MessageSend
}

func NewGameLogic() *GameLogic {
	return &GameLogic{}
}

func (g *GameLogic) Reset() {
	for i := 0; i < MAXROWS; i++ {
		for j := 0; j < MAXCOLS; j++ {
			g.cards[i][j] = make([]int, 0, MAXCARDS)
		}
	}
	g.msgs = g.msgs[:0]
}

func (g *GameLogic) PlantCard(col, row, id, level, uid int) {
	if (col < 0 || col >= MAXCOLS) || (row < 0 || row >= MAXROWS) {
		return
	}
	// 判断多张卡牌能否同时种植
	leng := len(g.cards[row][col])
	isOk := true

	for i := 0; i < leng; i++ {
		// 如果此loop卡片不和即将的id冲突
		// 当前默认全部冲突
		isOk = false
		break
	}

	if isOk {
		g.cards[row][col] = append(g.cards[row][col], id)
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

	// 如果此grid发生了植物种植事件
	grid := g.cards[row][col]
	leng := len(grid)
	if leng > 0 {
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
