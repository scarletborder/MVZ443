package roomatom

// 游戏开始后的视角
// GameLogic 结构体、ProcessFrame、EnqueueAction、游戏相关方法

import (
	"mvzserver/constants"
	messages "mvzserver/messages/pb"
	"sort"
	"strconv"
	"strings"
	"time"
)

const (
	maxResendPerSync uint32 = 32
	maxHistoryFrames uint32 = 600
)

const maxOperationUID uint32 = ^uint32(0)

func inGameOperationTypePriority(operation *messages.InGameOperation) int {
	if operation == nil || operation.Payload == nil {
		return 99
	}

	switch operation.Payload.(type) {
	case *messages.InGameOperation_RemovePlant:
		return 0
	case *messages.InGameOperation_UseStarShards:
		return 1
	case *messages.InGameOperation_CardPlant:
		return 2
	case *messages.InGameOperation_GameEvent:
		return 3
	case *messages.InGameOperation_Error:
		return 4
	default:
		return 99
	}
}

func inGameOperationUID(operation *messages.InGameOperation) uint32 {
	if operation == nil || operation.Payload == nil {
		return maxOperationUID
	}

	switch payload := operation.Payload.(type) {
	case *messages.InGameOperation_RemovePlant:
		if payload.RemovePlant != nil && payload.RemovePlant.Base != nil {
			return payload.RemovePlant.Base.Uid
		}
	case *messages.InGameOperation_UseStarShards:
		if payload.UseStarShards != nil && payload.UseStarShards.Base != nil {
			return payload.UseStarShards.Base.Uid
		}
	case *messages.InGameOperation_CardPlant:
		if payload.CardPlant != nil && payload.CardPlant.Base != nil {
			return payload.CardPlant.Base.Uid
		}
	}

	return maxOperationUID
}

func (room *Room) currentServerFrameID() uint32 {
	nextFrameID := room.RoomCtx.NextFrameID.Load()
	if nextFrameID == 0 {
		return 0
	}
	return nextFrameID - 1
}

func (room *Room) resetInGameState() {
	room.RoomCtx.NextFrameID.Store(1)
	room.scheduledFrames = make(map[uint32]*FrameSubmission)
	room.frameHistory = make(map[uint32]*messages.InGameResponse)
	room.Logic.Reset()
	for len(room.ingameOperations) > 0 {
		<-room.ingameOperations
	}
}

func (room *Room) ensureFrameSubmission(frameID uint32) *FrameSubmission {
	submission, ok := room.scheduledFrames[frameID]
	if ok {
		return submission
	}

	submission = &FrameSubmission{
		Operations:          make([]*messages.InGameOperation, 0, 2),
		OperationSignatures: make(map[string]struct{}),
	}
	room.scheduledFrames[frameID] = submission
	return submission
}

func (room *Room) recordOperationSubmission(frameID uint32, operation *messages.InGameOperation) {
	if operation == nil {
		return
	}

	submission := room.ensureFrameSubmission(frameID)
	signature := room.operationSignature(operation)
	if _, exists := submission.OperationSignatures[signature]; exists {
		return
	}

	submission.OperationSignatures[signature] = struct{}{}
	submission.Operations = append(submission.Operations, operation)
}

func (room *Room) operationSignature(operation *messages.InGameOperation) string {
	if operation == nil || operation.Payload == nil {
		return ""
	}

	switch payload := operation.Payload.(type) {
	case *messages.InGameOperation_CardPlant:
		return strings.Join([]string{
			strconv.FormatUint(uint64(operation.ProcessFrameId), 10),
			"cardPlant",
			strconv.FormatUint(uint64(payload.CardPlant.Pid), 10),
			strconv.FormatUint(uint64(payload.CardPlant.Level), 10),
			strconv.FormatUint(uint64(payload.CardPlant.Base.Uid), 10),
			strconv.FormatUint(uint64(payload.CardPlant.Base.Col), 10),
			strconv.FormatUint(uint64(payload.CardPlant.Base.Row), 10),
		}, ":")
	case *messages.InGameOperation_RemovePlant:
		return strings.Join([]string{
			strconv.FormatUint(uint64(operation.ProcessFrameId), 10),
			"removePlant",
			strconv.FormatUint(uint64(payload.RemovePlant.Pid), 10),
			strconv.FormatUint(uint64(payload.RemovePlant.Base.Uid), 10),
			strconv.FormatUint(uint64(payload.RemovePlant.Base.Col), 10),
			strconv.FormatUint(uint64(payload.RemovePlant.Base.Row), 10),
		}, ":")
	case *messages.InGameOperation_UseStarShards:
		return strings.Join([]string{
			strconv.FormatUint(uint64(operation.ProcessFrameId), 10),
			"useStarShards",
			strconv.FormatUint(uint64(payload.UseStarShards.Pid), 10),
			strconv.FormatUint(uint64(payload.UseStarShards.Base.Uid), 10),
			strconv.FormatUint(uint64(payload.UseStarShards.Base.Col), 10),
			strconv.FormatUint(uint64(payload.UseStarShards.Base.Row), 10),
		}, ":")
	default:
		return strings.Join([]string{
			strconv.FormatUint(uint64(operation.ProcessFrameId), 10),
			strconv.FormatUint(uint64(operation.OperationIndex), 10),
		}, ":")
	}
}

func (room *Room) lessInGameOperation(a *messages.InGameOperation, b *messages.InGameOperation) bool {
	if a.ProcessFrameId != b.ProcessFrameId {
		return a.ProcessFrameId < b.ProcessFrameId
	}

	aTypePriority := inGameOperationTypePriority(a)
	bTypePriority := inGameOperationTypePriority(b)
	if aTypePriority != bTypePriority {
		return aTypePriority < bTypePriority
	}

	aUID := inGameOperationUID(a)
	bUID := inGameOperationUID(b)
	if aUID != bUID {
		return aUID < bUID
	}

	return room.operationSignature(a) < room.operationSignature(b)
}

func (room *Room) advanceOneFrame() {
	frameID := room.currentServerFrameID() + 1
	submission := room.scheduledFrames[frameID]
	operations := make([]*messages.InGameOperation, 0)
	if submission != nil {
		operations = append(operations, submission.Operations...)
		sort.SliceStable(operations, func(i, j int) bool {
			return room.lessInGameOperation(operations[i], operations[j])
		})
	}

	for index, operation := range operations {
		operation.OperationIndex = uint32(index + 1)
		operation.ProcessFrameId = frameID
	}

	room.frameHistory[frameID] = &messages.InGameResponse{
		FrameId:    frameID,
		Operations: operations,
	}
	delete(room.scheduledFrames, frameID)
	room.Logic.ReleaseFrame(frameID)
	room.RoomCtx.NextFrameID.Store(frameID + 1)
}

func (room *Room) earliestHistoryFrameID() uint32 {
	if len(room.frameHistory) == 0 {
		return room.RoomCtx.NextFrameID.Load()
	}

	minFrameID := ^uint32(0)
	for frameID := range room.frameHistory {
		if frameID < minFrameID {
			minFrameID = frameID
		}
	}
	return minFrameID
}

func (room *Room) syncClientFrames(player *Player) {
	if player == nil || player.Ctx == nil || !player.Ctx.IsConnected() {
		return
	}

	serverFrameID := room.currentServerFrameID()
	if serverFrameID == 0 || len(room.frameHistory) == 0 {
		return
	}

	fromFrameID := player.Ctx.LatestAckFrameID.Load() + 1
	earliestFrameID := room.earliestHistoryFrameID()
	if fromFrameID < earliestFrameID {
		fromFrameID = earliestFrameID
	}
	if fromFrameID > serverFrameID {
		return
	}

	toFrameID := serverFrameID
	if delta := toFrameID - fromFrameID; delta >= maxResendPerSync {
		toFrameID = fromFrameID + maxResendPerSync - 1
	}

	for frameID := fromFrameID; frameID <= toFrameID; frameID++ {
		response, ok := room.frameHistory[frameID]
		if !ok {
			continue
		}
		room.RoomCtx.SendMessageToUserByPlayer(response, player)
	}
}

func (room *Room) syncAllClients() {
	room.RoomCtx.Players.Range(func(_ int, player *Player) bool {
		room.syncClientFrames(player)
		return true
	})
}

func (room *Room) pruneFrameHistory() {
	if len(room.frameHistory) == 0 {
		return
	}

	serverFrameID := room.currentServerFrameID()
	minAckFrameID := serverFrameID
	if room.GetPlayerCount() > 0 {
		minAckFrameID = ^uint32(0)
		room.RoomCtx.Players.Range(func(_ int, player *Player) bool {
			if player == nil || player.Ctx == nil {
				return true
			}
			ackFrameID := player.Ctx.LatestAckFrameID.Load()
			if ackFrameID < minAckFrameID {
				minAckFrameID = ackFrameID
			}
			return true
		})
	}

	for frameID := range room.frameHistory {
		tooOldForAck := frameID <= minAckFrameID
		tooOldForWindow := serverFrameID > maxHistoryFrames && frameID <= serverFrameID-maxHistoryFrames
		if tooOldForAck || tooOldForWindow {
			delete(room.frameHistory, frameID)
			room.Logic.ReleaseFrame(frameID)
		}
	}
}

func (room *Room) resolveProcessFrameID(baseReq *messages.RequestGridOperation) uint32 {
	frameID := room.currentServerFrameID() + constants.CommandLeadFrames
	if baseReq != nil && baseReq.ProcessFrameId > frameID {
		frameID = baseReq.ProcessFrameId
	}
	return frameID
}

func (room *Room) acceptInGameBase(player *Player, req *messages.RequestBlank) bool {
	if player == nil || player.Ctx == nil || req == nil {
		return false
	}
	if !room.GameStage.EqualTo(constants.STAGE_InGame) {
		return false
	}

	player.Ctx.UpdatePlayerFrame(req.FrameId, req.AckFrameId)
	return true
}

// 定时器触发的广播转发游戏操作帧
func (room *Room) runGameTick() {
	if !room.GameStage.EqualTo(constants.STAGE_InGame) {
		return
	}

	room.LastActiveTime = time.Now() // 更新最后活动时间
	room.advanceOneFrame()
	room.pruneFrameHistory()
	room.syncAllClients()
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
