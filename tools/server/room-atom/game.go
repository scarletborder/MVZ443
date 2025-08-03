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
	if !room.HasAllPlayerSync() {
		// 如果没有所有玩家同步，则跳过此次逻辑帧
		return
	}
	room.LastActiveTime = time.Now() // 更新最后活动时间
	var NextRenderFrame = room.RoomCtx.NextFrameID.Load()

	// 本次要发送的
	var Operations []*messages.InGameOperation

	defer func() {
		// 步进
		room.RoomCtx.NextFrameID.Add(1)
		// 删除本帧的操作ID记录
		room.RoomCtx.DeleteOperationID(NextRenderFrame)
	}()

	// 读取operation chan
ReadChan:
	for {
		select {
		case op := <-room.ingameOperations:
			// 忠实加入
			// 即使是以后游戏逻辑才会process的帧，也会因为帧同步游戏的性质加入
			// 让客户端知道未来会做哪些操作
			op.OperationIndex = room.RoomCtx.GetNextOperationID(op.ProcessFrameId)
			Operations = append(Operations, op)
		default:
			break ReadChan // 没有更多操作了
		}
	}

	// 广播
	resp := messages.InGameResponse{
		FrameId:    NextRenderFrame,
		Operations: Operations,
	}
	room.RoomCtx.BroadcastMessage(&resp, nil)
}

func (room *Room) HasAllPlayerSync() bool {
	// 延迟等待，最多容忍 maxDelayFrames 帧的延迟
	var minFrameID uint32
	var NextRenderFrame = room.RoomCtx.NextFrameID.Load()
	if NextRenderFrame < constants.MaxDelayFrames {
		minFrameID = 0
	} else {
		minFrameID = NextRenderFrame - constants.MaxDelayFrames
	}

	synced := true
	// 遍历每个玩家的 frameID，若有任意玩家低于阈值，则返回 false
	room.RoomCtx.Players.Range(func(key int, value *Player) bool {
		// 检查玩家是否为空或玩家上下文为空
		if value == nil || value.Ctx == nil {
			synced = false
			return false
		}
		// 获取当前玩家实际的帧号
		player_current_frame := value.Ctx.LatestFrameID.Load()
		if player_current_frame < minFrameID {
			synced = false
			return false
		}
		return true
	})
	return synced
}

// 用户可能会疯狂的消耗游戏资源从而种植/使用超过自己能量的植物
// 所以需要在处理请求时进行校验
func (room *Room) CouldAffordable(player *Player, base_req *messages.RequestBlank,
	energy_cost int32, starshards_cost int32,
	energy_sum int32, starshards_sum int32,
	lastFrameID uint32, lastAckFrameID uint32,
) bool {
	// 检查 player 是否为 nil
	if player == nil {
		return false
	}

	// 简化逻辑：对于第一次种植或使用星之碎片，只通过用户报的总量和消耗来判断
	isFirstEnergyOperation := player.LastEnergySum == 0 || lastFrameID <= 0
	isFirstStarShardsOperation := player.LastStarShards == 0 || lastFrameID <= 0

	// 验证能量消耗
	energyAffordable := true
	if energy_cost > 0 {
		if isFirstEnergyOperation {
			// 第一次种植：只检查总量是否足够
			energyAffordable = energy_sum >= energy_cost
		} else {
			// 非第一次：检查客户端自报的阳光是否足够
			energyAffordable = energy_sum >= energy_cost
		}
	}

	// 验证星之碎片消耗
	starShardsAffordable := true
	if starshards_cost > 0 {
		if isFirstStarShardsOperation {
			// 第一次使用星之碎片：只检查总量是否足够
			starShardsAffordable = starshards_sum >= starshards_cost
		} else {
			// 非第一次：检查客户端自报的星之碎片是否足够
			starShardsAffordable = starshards_sum >= starshards_cost
		}
	}

	return energyAffordable && starShardsAffordable
}
