package roomatom

import (
	"log"
	"mvzserver/clients"
	"mvzserver/constants"
	messages "mvzserver/messages/pb"
	"runtime/debug"

	"github.com/gofiber/websocket/v2"
	"google.golang.org/protobuf/proto"
)

type Player = clients.Player
type PlayerMessage = clients.PlayerMessage

// WS入口
func (room *Room) HandleClientJoin(c *websocket.Conn) {
	ctx := room.RoomCtx.CreateClientCtxFromConn(c)
	// 创建一个新的玩家实例
	p := clients.NewPlayer(ctx, room.incomingMessages)

	room.register <- &p // 将玩家加入到注册通道

	// TODO： 加入短线重连机制,.具体见我和gemini对话

	// 开始服务
	room.StartServeClient(&p)
}

// ---------------------------
// 状态机循环的处理函数
// ---------------------------

func (room *Room) handleRegister(player *clients.Player) {
	// ... 注册客户端逻辑 ...
	// 在 Lobby 状态下才允许新玩家加入
	if room.GameStage.EqualTo(constants.STAGE_InLobby) {
		// 向 context 中注册用户
		room.RoomCtx.AddUser(player)
		// TODO: 广播人数变化
	} else {
		// 拒绝加入
	}
}

func (room *Room) handleUnregister(player *clients.Player) {
	// ... 注销客户端逻辑 ...
	room.RoomCtx.DelUser(player.Ctx.Id) // 向 context 中注销用户
	// 关闭连接
	if player.Ctx != nil && player.Ctx.Conn != nil {
		player.Ctx.Close()
	}
	// 删除实例
	// 广播人数变化，如果状态是 Preparing/InGame，可能需要特殊处理
}

// 处理玩家WS消息
func (room *Room) handlePlayerMessage(msg *PlayerMessage) {
	defer func() {
		// release to pool
		clients.ReleasePlayerMessage(msg)

		if r := recover(); r != nil {
			// 发生了 panic，r 是 panic 的值
			log.Printf("处理用户信息时捕获到 Panic: %v\n", r)

			// 打印详细的堆栈信息，对于调试非常重要
			// debug.Stack() 返回格式化好的当前 goroutine 的堆栈跟踪
			log.Printf("堆栈信息:\n%s", string(debug.Stack()))

			// 在这里，你可以执行一些额外的清理工作，或者上报错误到监控系统
			log.Println("程序已从 panic 中恢复，将继续运行。")
		}
	}()
	// decode
	var request messages.Request

	// 2. 反序列化 (解码) 收到的二进制数据
	if err := proto.Unmarshal(msg.Data, &request); err != nil {
		log.Printf("Failed to unmarshal request: %v", err)
		return
	}

	switch payload := request.Payload.(type) {
	// InLobby
	case *messages.Request_ChooseMap:
		room.HandleRequestChooseMap(msg.Player, payload.ChooseMap)
	// Preparing
	case *messages.Request_Ready:
		room.HandleRequestReady(msg.Player, payload.Ready)
	// Loading
	case *messages.Request_Loaded:
		room.HandleRequestLoaded(msg.Player, payload.Loaded)
	// InGame
	case *messages.Request_Blank:
		room.HandleRequestBlank(msg.Player, payload.Blank)
	case *messages.Request_Plant:
		room.HandleRequestCardPlant(msg.Player, payload.Plant)
	case *messages.Request_RemovePlant:
		room.HandleRequestRemovePlant(msg.Player, payload.RemovePlant)
	case *messages.Request_StarShards:
		room.HandleRequestStarShards(msg.Player, payload.StarShards)
	case *messages.Request_EndGame:
		room.HandleRequestEndGame(msg.Player, payload.EndGame)
	default:
		// 未知请求类型
	}
}

func (room *Room) HandleRequestReady(player *Player, req *messages.RequestReady) {
	// 只能在 STAGE_Preparing 阶段处理
	if !room.GameStage.EqualTo(constants.STAGE_Preparing) {
		return
	}
	player.IsReady = req.IsReady
	// 判断是否所有玩家都准备就绪
	if room.HasAllPlayerReady() {
		// 如果所有玩家都准备好了，开始加载
		room.GameStage.Store(constants.STAGE_Loading)
		// 广播
		payload := messages.ResponseAllReady{
			AllPlayerCount: room.GetPlayerCount(),
		}
		resp := &messages.LobbyResponse{
			Payload: &messages.LobbyResponse_AllReady{
				AllReady: &payload,
			},
		}
		room.RoomCtx.BroadcastMessage(resp, nil)
	} else {
		// 发送一次信息， 提醒已经准备的人数
		payload := messages.ResponseUpdateReadyCount{
			Count:          room.PlayerReadyCount(),
			AllPlayerCount: room.GetPlayerCount(),
		}
		resp := &messages.LobbyResponse{
			Payload: &messages.LobbyResponse_UpdateReadyCount{
				UpdateReadyCount: &payload,
			},
		}
		room.RoomCtx.BroadcastMessage(resp, nil)
	}
}

func (room *Room) HandleRequestChooseMap(player *Player, req *messages.RequestChooseMap) {
	// 只能在 STAGE_InLobby 阶段处理
	if !room.GameStage.EqualTo(constants.STAGE_InLobby) {
		return
	}
	// 推进 prepareing 阶段
	room.GameStage.Store(constants.STAGE_Preparing)
	room.ChapterID = req.ChapterId
	room.StageID = req.StageId
	// 广播
	payload := messages.ResponseChooseMap{
		ChapterId: req.ChapterId,
		StageId:   req.StageId,
	}
	resp := &messages.LobbyResponse{
		Payload: &messages.LobbyResponse_ChooseMap{
			ChooseMap: &payload,
		},
	}
	room.RoomCtx.BroadcastMessage(resp, nil)
}

func (room *Room) HandleRequestLoaded(player *Player, req *messages.RequestLoaded) {
	// 只能在 STAGE_Loading 阶段处理
	if !room.GameStage.EqualTo(constants.STAGE_Loading) {
		return
	}
	player.IsLoaded = req.IsLoaded
	if room.HasAllPlayerLoaded() {
		// 如果所有玩家都加载完毕，开始游戏
		room.GameStage.Store(constants.STAGE_InGame)
		// 发送游戏开始广播帧
		payload := messages.ResponseAllLoaded{
			Seed: room.Seed,
		}
		resp := &messages.LobbyResponse{
			Payload: &messages.LobbyResponse_AllLoaded{
				AllLoaded: &payload,
			},
		}
		room.RoomCtx.BroadcastMessage(resp, nil)
		// 启动游戏逻辑定时器
		room.RoomCtx.StartGameTicker()
	}
}

// 判断游戏中的客户端发来帧是否可以采用以及更新frame状态
// Return: 这个帧是否可以采用（没有迟到）
func (room *Room) HandleRequestBlank(player *Player, req *messages.RequestBlank) bool {
	// 只能在 STAGE_InGame 阶段处理
	if !room.GameStage.EqualTo(constants.STAGE_InGame) {
		return false
	}
	if req.FrameId < player.Ctx.LatestFrameID.Load() {
		// 迟到的帧请求，直接忽略
		return false
	}
	// 空帧请求
	// 维护该玩家的帧ID和ack ID
	player.Ctx.UpdatePlayerFrame(req.FrameId, req.AckFrameId)
	return true
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

func (room *Room) HandleRequestCardPlant(player *Player, req *messages.RequestCardPlant) {
	if !room.HandleRequestBlank(player, req.Base.Base) {
		return
	}
	if !room.CouldAffordable(player, req.Base.Base, req.Cost, 0, req.EnergySum, req.StarShardsSum) {
		// 无法负担
		return
	}
	room.Logic.PlantCard(player, req)
}

func (room *Room) HandleRequestRemovePlant(player *Player, req *messages.RequestRemovePlant) {
	if !room.HandleRequestBlank(player, req.Base.Base) {
		return
	}
	room.Logic.RemoveCard(player, req)
}

func (room *Room) HandleRequestStarShards(player *Player, req *messages.RequestStarShards) {
	if !room.HandleRequestBlank(player, req.Base.Base) {
		return
	}
	if !room.CouldAffordable(player, req.Base.Base, 0, req.Cost, req.EnergySum, req.StarShardsSum) {
		// 无法负担
		return
	}
	room.Logic.UseStarShards(player, req)
}

func (room *Room) HandleRequestEndGame(player *Player, req *messages.RequestEndGame) {
	// 只能在 STAGE_InGame 阶段处理
	if !room.GameStage.EqualTo(constants.STAGE_InGame) {
		return
	}

	// 之后进入 PostGame 阶段
	room.GameStage.Store(constants.STAGE_PostGame)
	// 广播game end
	payload := messages.ResponseGameEnd{
		GameResult: req.GameResult,
	}
	resp := &messages.LobbyResponse{
		Payload: &messages.LobbyResponse_GameEnd{
			GameEnd: &payload,
		},
	}
	room.RoomCtx.BroadcastMessage(resp, nil)

	// 重置房间允许下一场游戏
}
