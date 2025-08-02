package roomatom

// 游戏开始后的视角
// GameLogic 结构体、ProcessFrame、EnqueueAction、游戏相关方法

import (
	"mvzserver/constants"
	messages "mvzserver/messages/pb"
	"time"
)

// 定时器触发的广播转发游戏操作帧
func (room *Room) runGameTick() {
	room.LastActiveTime = time.Now() // 更新最后活动时间

	// 本次要发送的
	var Operations []*messages.InGameOperation

	// 读取operation chan
ReadChan:
	for {
		select {
		case op := <-room.ingameOperations:
			if !room.HasAllPlayerSync() {
				// 如果没有所有玩家同步，则不处理操作
				return
			}
			// 忠实加入
			// 即使是以后游戏逻辑才会process的帧，也会因为帧同步游戏的性质加入
			Operations = append(Operations, op)
		default:
			break ReadChan // 没有更多操作了
		}
	}

	// 广播
	resp := messages.InGameResponse{
		FrameId:    uint32(room.RoomCtx.FrameID),
		Operations: Operations,
	}
	room.RoomCtx.BroadcastMessage(&resp, nil)
}

func (room *Room) HasAllPlayerSync() bool {
	// 延迟等待，最多容忍 maxDelayFrames 帧的延迟
	var minFrameID uint32
	if room.RoomCtx.FrameID < constants.MaxDelayFrames {
		minFrameID = 0
	} else {
		minFrameID = room.RoomCtx.FrameID - constants.MaxDelayFrames
	}

	synced := true
	// 遍历每个玩家的 frameID，若有任意玩家低于阈值，则返回 false
	room.RoomCtx.Players.Range(func(key int, value *Player) bool {
		// 当前玩家认为自己位于的帧号
		player_current_frame := value.Ctx.LatestFrameID.Load()
		if player_current_frame < minFrameID {
			synced = false
			return false
		}
		return true
	})
	return synced
}
