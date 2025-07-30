package roomatom

import (
	"mvzserver/constants"
	"mvzserver/messages"
	"sync/atomic"
	"time"
)

// 服务房间内部玩家与房间的交互

/**
 * 获得下一帧(下一次发送的时候)ID
 */
func (r *Room) GetNextFrameID() uint16 {
	return r.FrameID + 1
}

func (r *Room) waitGameStart() {
waitLoop:
	for {
		// TODO: 修改逻辑,由玩家事件触发游戏开始, 而非定期检测

		// 当 ReadyCount 大于 0 且所有加入的玩家均准备完毕时，通知所有玩家游戏开始
		if r.ReadyCount > 0 && atomic.LoadInt32(&r.ReadyCount) == int32(r.GetPlayerCount()) {
			// 遍历所有客户端，通知玩家游戏开始
			// TODO: 封装一个单独的开始游戏方法
			r.RoomCtx.Clients.Range(func(key, value interface{}) bool {
				if uc, ok := value.(*ClientCtx); ok {
					uc.StartChan <- struct{}{}
				}
				return true
			})
			atomic.StoreInt32(&r.ReadyCount, 0)
			r.GameLoopStartChan <- struct{}{}
			break waitLoop
		}

		select {
		case <-r.GameDeadChan:
			return
		default:
			time.Sleep(1 * time.Second)
		}
	}
}

func (r *Room) gameLoop() {
	r.gameStarted = true
	r.RoomCtx.BroadcastGameStart()
	timer := time.NewTicker(constants.FrameTick * time.Millisecond)

	for {
		select {
		case <-timer.C:
			// 判断是否所有的玩家的 frameID 都已经同步
			if !r.HasAllPlayerSync() {
				continue
			}
			// 更新最后活动时间
			r.LastActiveTime = time.Now()
			// 广播游戏状态
			r.broadcastGameState()
		case <-r.GameDeadChan:
			return
		}
	}
}

func (r *Room) broadcastGameState() {
	r.FrameID++ // 更新当前帧ID

	// 如果没有消息，则构建一个空消息
	if len(r.Logic.msgs) == 0 {
		data, err := messages.EncodeMessage(messages.BlankMsg{
			Type:    messages.MsgTypeBlank,
			FrameID: r.FrameID,
		})
		if err != nil {
			return
		}
		r.Logic.msgs = append(r.Logic.msgs, data)
	}

	// 广播消息给每个客户端，通过 sync.Map.Range 遍历所有连接
	r.RoomCtx.Clients.Range(func(key, value interface{}) bool {
		if uc, ok := value.(*userCtx); ok {
			// 忽略错误处理，可根据实际需要添加
			uc.WriteJSON(r.Logic.msgs)
		}
		return true
	})

	r.Logic.Reset()
}

func (r *Room) HasAllPlayerSync() bool {
	// 延迟等待，最多容忍 maxDelayFrames 帧的延迟
	var minFrameID uint16
	if r.FrameID < constants.MaxDelayFrames {
		minFrameID = 0
	} else {
		minFrameID = r.FrameID - constants.MaxDelayFrames
	}

	synced := true
	// 遍历每个玩家的 frameID，若有任意玩家低于阈值，则返回 false
	r.RoomCtx.PlayerFrameID.Range(func(key, value interface{}) bool {
		if frameID, ok := value.(uint16); ok {
			if frameID < minFrameID {
				synced = false
				return false
			}
		}
		return true
	})
	return synced
}

func (r *Room) UpdatePlayerFrameID(uid int, frameID uint16) {
	// 使用 Load 获取当前记录的 frameID
	if value, ok := r.RoomCtx.PlayerFrameID.Load(uid); ok {
		if cur, ok := value.(uint16); ok {
			if frameID > cur {
				r.RoomCtx.PlayerFrameID.Store(uid, frameID)
			}
		}
	} else {
		// 若不存在则直接存储
		r.RoomCtx.PlayerFrameID.Store(uid, frameID)
	}
}
