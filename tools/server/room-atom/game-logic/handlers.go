package gamelogic

import (
	"mvzserver/clients"
	messages "mvzserver/messages/pb"
)

func (g *GameLogic) PlantCard(player *clients.Player, request *messages.RequestCardPlant) {
	gridOp := &messages.ResponseGridOperation{
		Uid: uint32(player.GetID()),
		Col: request.Base.Col,
		Row: request.Base.Row,
	}
	plantOp := &messages.ResponseCardPlant{
		Pid:     request.Pid,
		Level:   request.Level,
		Cost:    request.Cost,
		Base:    gridOp,
	}

	if request.Base.Col < 0 || request.Base.Col >= MAXCOLS ||
		request.Base.Row < 0 || request.Base.Row >= MAXROWS {
		// 无效的grid
		g.operationChan <- &messages.InGameOperation{
			Payload: &messages.InGameOperation_CardPlant{
				CardPlant: plantOp,
			},
			ProcessFrameId: request.Base.ProcessFrameId,
		}
		return
	}
	// 判断这个grid有没有做过操作
	if g.cards[request.Base.Row][request.Base.Col] {
		// true=> 有操作
		g.operationChan <- &messages.InGameOperation{
			Payload: &messages.InGameOperation_CardPlant{
				CardPlant: plantOp,
			},
		}
		return
	}

	// 成功
	g.cards[request.Base.Row][request.Base.Col] = true

	g.operationChan <- &messages.InGameOperation{
		Payload: &messages.InGameOperation_CardPlant{
			CardPlant: plantOp,
		},
	}
}

func (g *GameLogic) RemoveCard(player *clients.Player, request *messages.RequestRemovePlant) {
	gridOp := &messages.ResponseGridOperation{
		Uid: uint32(player.GetID()),
		Col: request.Base.Col,
		Row: request.Base.Row,
	}
	removeOp := &messages.ResponseRemovePlant{
		Pid:  request.Pid,
		Base: gridOp,
	}

	if request.Base.Col < 0 || request.Base.Col >= MAXCOLS ||
		request.Base.Row < 0 || request.Base.Row >= MAXROWS {
		// 铲除失败不会有回复
		return
	}

	// 判断这个grid有没有做过操作
	if g.cards[request.Base.Row][request.Base.Col] {
		// true=> 有操作
		// 铲除失败不会有回复
		return
	}

	g.cards[request.Base.Row][request.Base.Col] = true
	g.operationChan <- &messages.InGameOperation{
		Payload: &messages.InGameOperation_RemovePlant{
			RemovePlant: removeOp,
		},
		ProcessFrameId: request.Base.ProcessFrameId,
	}
}

func (g *GameLogic) UseStarShards(player *clients.Player, request *messages.RequestStarShards) {
	gridOp := &messages.ResponseGridOperation{
		Uid: uint32(player.GetID()),
		Col: request.Base.Col,
		Row: request.Base.Row,
	}
	starshardsOp := &messages.ResponseUseStarShards{
		Pid:     request.Pid,
		Cost:    request.Cost,
		Base:    gridOp,
	}

	if request.Base.Col < 0 || request.Base.Col >= MAXCOLS ||
		request.Base.Row < 0 || request.Base.Row >= MAXROWS {
		g.operationChan <- &messages.InGameOperation{
			Payload: &messages.InGameOperation_UseStarShards{
				UseStarShards: starshardsOp,
			},
			ProcessFrameId: request.Base.ProcessFrameId,
		}
		return
	}

	// 判断这个grid有没有做过操作
	if g.cards[request.Base.Row][request.Base.Col] {
		// true=> 有操作
		g.operationChan <- &messages.InGameOperation{
			Payload: &messages.InGameOperation_UseStarShards{
				UseStarShards: starshardsOp,
			},
		}
		return
	}
	// 成功
	g.cards[request.Base.Row][request.Base.Col] = true

	g.operationChan <- &messages.InGameOperation{
		Payload: &messages.InGameOperation_UseStarShards{
			UseStarShards: starshardsOp,
		},
	}
}
