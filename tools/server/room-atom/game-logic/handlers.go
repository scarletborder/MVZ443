package gamelogic

import (
	"mvzserver/clients"
	messages "mvzserver/messages/pb"
)

func (g *GameLogic) PlantCard(player *clients.Player, request *messages.RequestCardPlant) {
	gridOp := &messages.ResponseGridOperation{
		Uid:            uint32(player.GetID()),
		Col:            request.Base.Col,
		Row:            request.Base.Row,
		ProcessFrameId: request.Base.ProcessFrameId,
	}
	plantOp := &messages.ResponseCardPlant{
		Pid:     request.Pid,
		Level:   request.Level,
		Cost:    request.Cost,
		Success: false, // 默认失败
		Base:    gridOp,
	}

	if request.Base.Col < 0 || request.Base.Col >= MAXCOLS ||
		request.Base.Row < 0 || request.Base.Row >= MAXROWS {
		// 无效的grid
		plantOp.Success = false
		g.operationChan <- &messages.InGameOperation{
			Payload: &messages.InGameOperation_CardPlant{
				CardPlant: plantOp,
			},
		}
		return
	}
	// 判断这个grid有没有做过操作
	if g.cards[request.Base.Row][request.Base.Col] {
		// true=> 有操作
		plantOp.Success = false
		g.operationChan <- &messages.InGameOperation{
			Payload: &messages.InGameOperation_CardPlant{
				CardPlant: plantOp,
			},
		}
		return
	}

	// 成功
	g.cards[request.Base.Row][request.Base.Col] = true
	plantOp.Success = true

	g.operationChan <- &messages.InGameOperation{
		Payload: &messages.InGameOperation_CardPlant{
			CardPlant: plantOp,
		},
	}
}

func (g *GameLogic) RemoveCard(player *clients.Player, request *messages.RequestRemovePlant) {
	gridOp := &messages.ResponseGridOperation{
		Uid:            uint32(player.GetID()),
		Col:            request.Base.Col,
		Row:            request.Base.Row,
		ProcessFrameId: request.Base.ProcessFrameId,
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
	}
}

func (g *GameLogic) UseStarShards(player *clients.Player, request *messages.RequestStarShards) {
	gridOp := &messages.ResponseGridOperation{
		Uid:            uint32(player.GetID()),
		Col:            request.Base.Col,
		Row:            request.Base.Row,
		ProcessFrameId: request.Base.ProcessFrameId,
	}
	starshardsOp := &messages.ResponseUseStarShards{
		Pid:     request.Pid,
		Cost:    request.Cost,
		Success: false, // 默认失败
		Base:    gridOp,
	}

	if request.Base.Col < 0 || request.Base.Col >= MAXCOLS ||
		request.Base.Row < 0 || request.Base.Row >= MAXROWS {
		starshardsOp.Success = false
		g.operationChan <- &messages.InGameOperation{
			Payload: &messages.InGameOperation_UseStarShards{
				UseStarShards: starshardsOp,
			},
		}
		return
	}

	// 判断这个grid有没有做过操作
	if g.cards[request.Base.Row][request.Base.Col] {
		// true=> 有操作
		starshardsOp.Success = false
		g.operationChan <- &messages.InGameOperation{
			Payload: &messages.InGameOperation_UseStarShards{
				UseStarShards: starshardsOp,
			},
		}
		return
	}
	// 成功
	g.cards[request.Base.Row][request.Base.Col] = true
	starshardsOp.Success = true

	g.operationChan <- &messages.InGameOperation{
		Payload: &messages.InGameOperation_UseStarShards{
			UseStarShards: starshardsOp,
		},
	}
}
