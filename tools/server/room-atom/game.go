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
		// 当前玩家认为自己位于的帧号
		player_current_frame := NextRenderFrame
		if player_current_frame < minFrameID {
			synced = false
			return false
		}
		return true
	})
	return synced
}

// 对于游戏中消耗性资源
// 因为发送的广播frame到达会迟于用户消耗
// 用户可能会疯狂的消耗游戏资源从而种植/使用超过自己能量的植物
// 所以需要在处理请求时进行校验
func (room *Room) CouldAffordable(player *Player, base_req *messages.RequestBlank,
	energy_cost int32, starshards_cost int32,
	energy_sum int32, starshards_sum int32,
) bool {
	type ClientFrameData struct {
		CurrentLogicFrame  uint32 // 他当前的逻辑帧
		LastAckServerFrame uint32 // 他上一次ack的服务器帧
		SunOnPlant         int32  // 他此次种植行为发生时候的当前阳光总数
		PlantCost          int32  // 种植的植物需要消耗的阳光
	}
	// ServerUserRecord 服务器记录的该用户上一次成功操作的数据
	type ServerUserRecord struct {
		LastUserLogicFrame uint32 // 上一次的最近逻辑帧
		LastAckServerFrame uint32 // 上一次ack的服务器帧
		SunBeforeLastPlant int32  // 上一次成功种植时候用户种植前的阳光总数
		LastPlantCost      int32  // 上一次成功种植时用户消耗的阳光
	}

	CanPlantValidate := func(clientData ClientFrameData, serverRecord ServerUserRecord) bool {
		// 1. 基础校验：客户端自认为阳光不足，这是最直接的失败
		if clientData.SunOnPlant < clientData.PlantCost {
			return false
		}
		// 2. 首次操作处理: 如果服务器没有记录(用0等默认值表示)，则为首次操作
		if serverRecord.LastUserLogicFrame <= 0 {
			// 此处已通过了最开始的校验，所以直接成功
			return true
		}
		// 3. 陈旧/重复的帧请求校验
		if clientData.CurrentLogicFrame <= serverRecord.LastUserLogicFrame {
			return false
		}
		// 4. 核心逻辑：判断是否为快速连续操作
		isNormalOperation := clientData.LastAckServerFrame > serverRecord.LastAckServerFrame

		if isNormalOperation {
			// --- 常规操作 ---
			// 客户端状态是“新”的，它上报的阳光数是在收到了服务器所有回执后的最新状态。
			// 我们可以信任这个值作为校验的基准。
			// 该校验在函数入口已完成，此处确认逻辑正确。
			return true
		} else {
			// --- 快速连续操作 ---
			// 客户端在发送此请求时，还不知道上一个操作的结果。
			// 它上报的 SunOnPlant 是扣除了上次消耗后，又加上了本地新增阳光的结果。
			// 我们需要重建一个可信的“阳光池”来进行校验。

			// 有效阳光池 = 客户端上报的阳光 + 服务器记录的上次消耗（因为客户端已经减过一次了，我们要加回来）
			effectiveSunPool := clientData.SunOnPlant + serverRecord.LastPlantCost

			// 总消耗 = 服务器记录的上次消耗 + 本次新请求的消耗
			totalCost := serverRecord.LastPlantCost + clientData.PlantCost

			if effectiveSunPool >= totalCost {
				return true
			} else {
				return false
			}
		}
	}
	lastFrameID := player.Ctx.LatestFrameID.Load()
	lastAckFrameID := player.Ctx.LatestAckFrameID.Load()

	clientData_energy := ClientFrameData{
		CurrentLogicFrame:  base_req.FrameId,
		LastAckServerFrame: base_req.AckFrameId,
		SunOnPlant:         energy_sum,
		PlantCost:          energy_cost,
	}
	serverData_energy := ServerUserRecord{
		LastUserLogicFrame: lastFrameID,
		LastAckServerFrame: lastAckFrameID,
		SunBeforeLastPlant: player.LastEnergySum,
		LastPlantCost:      player.LastStarShards,
	}
	clientData_starshards := ClientFrameData{
		CurrentLogicFrame:  base_req.FrameId,
		LastAckServerFrame: base_req.AckFrameId,
		SunOnPlant:         starshards_sum,
		PlantCost:          starshards_cost,
	}
	serverData_starshards := ServerUserRecord{
		LastUserLogicFrame: lastFrameID,
		LastAckServerFrame: lastAckFrameID,
		SunBeforeLastPlant: player.LastStarShards,
		LastPlantCost:      player.LastStarShards,
	}

	return ((energy_cost == 0) || CanPlantValidate(clientData_energy, serverData_energy)) &&
		((starshards_cost == 0) || CanPlantValidate(clientData_starshards, serverData_starshards))
}
