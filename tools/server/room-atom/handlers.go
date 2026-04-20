package roomatom

import (
	"encoding/json"
	"log"
	"mvzserver/clients"
	"mvzserver/constants"
	messages "mvzserver/messages/pb"
	"mvzserver/utils"

	"runtime/debug"
	"sort"

	"github.com/gofiber/websocket/v2"
	"google.golang.org/protobuf/proto"
)

type Player = clients.Player
type PlayerMessage = clients.PlayerMessage

// WS入口
func (room *Room) HandleClientJoin(c *websocket.Conn) {
	log.Printf("🟢 Client connecting to room %d", room.ID)

	// 检查连接是否有效
	if c == nil {
		log.Printf("🔴 WebSocket connection is nil")
		return
	}
	log.Printf("🟢 WebSocket connection is valid")

	ctx := room.RoomCtx.CreateClientCtxFromConn(c)
	log.Printf("🟢 Created client context with ID %d", ctx.Id)

	// 再次检查连接
	if !ctx.IsConnected() {
		log.Printf("🔴 Connection became nil after creating context")
		return
	}
	log.Printf("🟢 Connection is still valid after creating context")

	var payload = messages.ResponseJoinRoomSuccess{
		RoomId:  uint32(room.ID),
		MyId:    uint32(ctx.Id),
		Key:     room.key,
		Message: "加入房间成功",
	}
	var resp = messages.LobbyResponse{
		Payload: &messages.LobbyResponse_JoinRoomSuccess{
			JoinRoomSuccess: &payload,
		},
	}
	log.Printf("🟢 Sending joinRoomSuccess to client %d", ctx.Id)
	utils.WriteLobbyResponse(c, &resp)
	log.Printf("🟢 joinRoomSuccess sent to client %d", ctx.Id)

	// 检查连接在发送响应后的状态
	if !ctx.IsConnected() {
		log.Printf("🔴 Connection became nil after sending response")
		return
	}
	log.Printf("🟢 Connection is still valid after sending response")

	// 创建一个新的玩家实例
	p := clients.NewPlayer(ctx, room.incomingMessages)

	// 最后检查连接
	if !p.Ctx.IsConnected() {
		log.Printf("🔴 Connection became nil after creating player")
		return
	}
	log.Printf("🟢 Connection is still valid after creating player")

	log.Printf("🟢 Registering player %d first", ctx.Id)
	room.register <- &p // 先将玩家加入到注册通道
	log.Printf("🟢 Player %d registration sent to channel", ctx.Id)

	// **关键修复**：直接在这里处理客户端，而不是在 goroutine 中
	log.Printf("🟢 Starting client service for player %d directly", ctx.Id)
	room.StartServeClient(&p) // 阻塞直到连接关闭
	log.Printf("🟢 Client service ended for player %d", ctx.Id)
}

// ---------------------------
// 状态机循环的处理函数
// ---------------------------

func (room *Room) handleRegister(player *clients.Player) {
	// ... 注册客户端逻辑 ...
	log.Printf("🔵 Processing registration for player %d", player.GetID())

	// 更新房间活跃时间
	room.UpdateActiveTime()

	// 在 Lobby 状态下才允许新玩家加入
	if room.GameStage.EqualTo(constants.STAGE_InLobby) {
		log.Printf("🔵 Room is in lobby state, adding player %d", player.GetID())
		// 向 context 中注册用户
		room.RoomCtx.AddUser(player)

		// **移除 goroutine**：现在 StartServeClient 在 HandleClientJoin 中直接调用
		// go func() {
		//     log.Printf("🟢 Starting client service for player %d", player.GetID())
		//     room.StartServeClient(player)
		// }()

		// 制作当前peers信息json
		// peers = [{"addr" : string, "id": int}, ...]
		type PeerInfo struct {
			Addr string `json:"addr"`
			Id   int    `json:"id"`
		}
		var peers []PeerInfo
		room.RoomCtx.Players.Range(func(uid int, player *clients.Player) bool {
			// 检查 player 和 player.Ctx 是否为 nil，并安全地检查连接
			if player == nil || player.Ctx == nil || !player.Ctx.IsConnected() {
				return true // 跳过无效的玩家
			}
			addr := "111.111.111.111"
			peers = append(peers, PeerInfo{
				Addr: addr,
				Id:   player.Ctx.Id,
			})
			return true
		})
		jsonPeers, _ := json.Marshal(peers)
		jsonPeersStr := string(jsonPeers)
		log.Printf("🔵 Created peers JSON for broadcast: %s", jsonPeersStr)

		// 进行一次广播
		log.Printf("🔵 Starting roomInfo broadcast to %d players", len(peers))
		room.RoomCtx.Players.Range(func(uid int, player *clients.Player) bool {
			// 检查 player 和 player.Ctx 是否为 nil
			if player == nil || player.Ctx == nil {
				return true // 跳过无效的玩家
			}
			defer func() {
				if r := recover(); r != nil {
					log.Printf("处理玩家注册时捕获到 Panic: %v\n", r)
					log.Printf("堆栈信息:\n%s", string(debug.Stack()))
				}
			}()
			payload := messages.ResponseRoomInfo{
				Peers:  jsonPeersStr,
				RoomId: uint32(room.ID),
				LordId: uint32(room.RoomCtx.OwnerUserID),
				MyId:   uint32(player.Ctx.Id),
			}
			log.Printf("🔵 Sending roomInfo to player %d", player.Ctx.Id)
			room.RoomCtx.SendMessageToUserByPlayer(&messages.RoomResponse{
				Payload: &messages.RoomResponse_RoomInfo{
					RoomInfo: &payload,
				},
			}, player)
			log.Printf("🔵 roomInfo sent to player %d", player.Ctx.Id)
			return true
		})
		log.Printf("🔵 roomInfo broadcast completed for player registration %d", player.GetID())
	} else {
		// 拒绝加入
		log.Printf("🔴 Registration rejected for player %d - room not in lobby state", player.GetID())
	}
}

func (room *Room) handleUnregister(player *clients.Player) {
	// ... 注销客户端逻辑 ...
	// 检查 player 和 player.Ctx 是否为 nil
	if player == nil || player.Ctx == nil {
		return
	}
	room.RoomCtx.DelUser(player.Ctx.Id) // 向 context 中注销用户
	// 关闭连接
	if player.Ctx.IsConnected() {
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

	// 更新房间活跃时间 - 任何玩家消息都表示房间是活跃的
	room.UpdateActiveTime()

	// decode
	var request messages.Request

	// 2. 反序列化 (解码) 收到的二进制数据
	if err := proto.Unmarshal(msg.Data, &request); err != nil {
		log.Printf("Failed to unmarshal request: %v", err)
		return
	}

	// 验证 payload 不为 nil
	if request.Payload == nil {
		log.Printf("🔴 Request payload is nil for player %d", msg.Player.GetID())
		return
	}

	switch payload := request.Payload.(type) {
	// InLobby
	case *messages.Request_ChooseMap:
		room.HandleRequestChooseMap(msg.Player, payload.ChooseMap)
	// Preparing
	case *messages.Request_Ready:
		room.HandleRequestReady(msg.Player, payload.Ready)
	case *messages.Request_LeaveChooseMap:
		room.HandleRequestLeaveChooseMap(msg.Player, payload.LeaveChooseMap)
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
	log.Printf("🔵 HandleRequestReady: Player %d, isReady: %v, current stage: %d",
		player.GetID(), req.IsReady, room.GameStage.Load())

	// 只能在 STAGE_Preparing 阶段处理
	if !room.GameStage.EqualTo(constants.STAGE_Preparing) {
		log.Printf("🔴 HandleRequestReady: Rejected - room not in Preparing stage, current: %d",
			room.GameStage.Load())
		return
	}

	player.IsReady = req.IsReady
	log.Printf("🔵 HandleRequestReady: Set player %d isReady to %v", player.GetID(), req.IsReady)

	// 检查所有玩家状态
	totalPlayers := room.GetPlayerCount()
	readyCount := 0
	room.RoomCtx.Players.Range(func(key int, value *clients.Player) bool {
		if value.IsReady {
			readyCount++
		}
		log.Printf("🔵 Player %d: isReady=%v", key, value.IsReady)
		return true
	})

	log.Printf("🔵 HandleRequestReady: %d/%d players ready", readyCount, totalPlayers)

	// 判断是否所有玩家都准备就绪
	if room.HasAllPlayerReady() {
		log.Printf("🟢 All players ready! Starting loading phase...")
		// 如果所有玩家都准备好了，开始加载
		room.GameStage.Store(constants.STAGE_Loading)
		playerIDs := make([]uint32, 0, totalPlayers)
		room.RoomCtx.Players.Range(func(_ int, value *clients.Player) bool {
			if value != nil && value.Ctx != nil {
				playerIDs = append(playerIDs, uint32(value.Ctx.Id))
			}
			return true
		})
		sort.Slice(playerIDs, func(i, j int) bool { return playerIDs[i] < playerIDs[j] })

		room.RoomCtx.Players.Range(func(_ int, value *clients.Player) bool {
			if value == nil || value.Ctx == nil {
				return true
			}
			payload := messages.ResponseAllReady{
				AllPlayerCount: room.GetPlayerCount(),
				Seed:           room.Seed,
				MyId:           uint32(value.Ctx.Id),
				PlayerIds:      playerIDs,
			}
			resp := &messages.RoomResponse{
				Payload: &messages.RoomResponse_AllReady{
					AllReady: &payload,
				},
			}
			room.RoomCtx.SendMessageToUserByPlayer(resp, value)
			return true
		})
		log.Printf("🟢 AllReady message sent")
	} else {
		log.Printf("🟡 Not all players ready yet, sending ready count update...")
		// 发送一次信息， 提醒已经准备的人数
		payload := messages.ResponseUpdateReadyCount{
			Count:          room.PlayerReadyCount(),
			AllPlayerCount: room.GetPlayerCount(),
		}
		resp := &messages.RoomResponse{
			Payload: &messages.RoomResponse_UpdateReadyCount{
				UpdateReadyCount: &payload,
			},
		}
		room.RoomCtx.BroadcastMessage(resp, nil)
		log.Printf("🟡 Ready count update sent: %d/%d", readyCount, totalPlayers)
	}
}

func (room *Room) HandleRequestChooseMap(player *Player, req *messages.RequestChooseMap) {
	// 只能在 STAGE_InLobby 阶段处理
	if !room.GameStage.EqualTo(constants.STAGE_InLobby) {
		return
	}

	// 更新房间活跃时间 - 选择地图是重要的游戏进展
	room.UpdateActiveTime()

	// 推进 prepareing 阶段
	room.GameStage.Store(constants.STAGE_Preparing)
	room.ChapterID = req.ChapterId
	room.StageID = req.StageId
	// 广播
	payload := messages.ResponseChooseMap{
		ChapterId: req.ChapterId,
		StageId:   req.StageId,
	}
	resp := &messages.RoomResponse{
		Payload: &messages.RoomResponse_ChooseMap{
			ChooseMap: &payload,
		},
	}
	room.RoomCtx.BroadcastMessage(resp, nil)
}

func (room *Room) HandleRequestLeaveChooseMap(player *Player, req *messages.RequestLeaveChooseMap) {
	// 检查 player 和 player.Ctx 是否为 nil
	if player == nil || player.Ctx == nil {
		return
	}
	// 只有房主能这样做
	if room.RoomCtx.OwnerUserID != player.Ctx.Id {
		return
	}
	// 只能在 STAGE_Preparing 阶段处理
	if !room.GameStage.EqualTo(constants.STAGE_Preparing) {
		return
	}

	// 更新房间活跃时间 - 离开选卡也是游戏操作
	room.UpdateActiveTime()

	room.GameStage.Store(constants.STAGE_InLobby)
	room.ChapterID = 0
	room.StageID = 0
	// 广播，退出选卡
	payload := messages.ResponseQuitChooseMap{}
	resp := &messages.RoomResponse{
		Payload: &messages.RoomResponse_QuitChooseMap{
			QuitChooseMap: &payload,
		},
	}
	room.RoomCtx.BroadcastMessage(resp, nil)
}

func (room *Room) HandleRequestLoaded(player *Player, req *messages.RequestLoaded) {
	log.Printf("🔵 HandleRequestLoaded: Player %d, isLoaded: %v, current stage: %d",
		player.GetID(), req.IsLoaded, room.GameStage.Load())

	// 只能在 STAGE_Loading 阶段处理
	if !room.GameStage.EqualTo(constants.STAGE_Loading) {
		log.Printf("🔴 HandleRequestLoaded: Rejected - room not in Loading stage, current: %d",
			room.GameStage.Load())
		return
	}

	player.IsLoaded = req.IsLoaded
	log.Printf("🔵 HandleRequestLoaded: Set player %d isLoaded to %v", player.GetID(), req.IsLoaded)

	// 检查所有玩家状态
	totalPlayers := room.GetPlayerCount()
	loadedCount := 0
	room.RoomCtx.Players.Range(func(key int, value *clients.Player) bool {
		if value.IsLoaded {
			loadedCount++
		}
		log.Printf("🔵 Player %d: isLoaded=%v", key, value.IsLoaded)
		return true
	})

	log.Printf("🔵 HandleRequestLoaded: %d/%d players loaded", loadedCount, totalPlayers)

	if room.HasAllPlayerLoaded() {
		log.Printf("🟢 All players loaded! Starting game...")
		// 如果所有玩家都加载完毕，开始游戏
		room.resetInGameState()
		room.GameStage.Store(constants.STAGE_InGame)
		// 发送游戏开始广播帧
		payload := messages.ResponseAllLoaded{}
		resp := &messages.RoomResponse{
			Payload: &messages.RoomResponse_AllLoaded{
				AllLoaded: &payload,
			},
		}
		room.RoomCtx.BroadcastMessage(resp, nil)
		log.Printf("🟢 AllLoaded message sent with seed: %d", room.Seed)
		// 启动游戏逻辑定时器
		room.RoomCtx.StartGameTicker()
		log.Printf("🟢 Game ticker started")
	} else {
		log.Printf("🟡 Not all players loaded yet, waiting...")
	}
}

// 判断游戏中的客户端发来帧是否可以采用以及更新frame状态
// Return: 这个帧是否可以采用（没有迟到）
func (room *Room) HandleRequestBlank(player *Player, req *messages.RequestBlank) bool {
	if !room.acceptInGameBase(player, req) {
		return false
	}
	room.pruneFrameHistory()
	room.syncAllClients()
	return true
}

func (room *Room) HandleRequestCardPlant(player *Player, req *messages.RequestCardPlant) {
	// 检查 req 和其嵌套字段是否为 nil
	if req == nil {
		log.Printf("🔴 HandleRequestCardPlant: req is nil for player %d", player.GetID())
		return
	}
	if req.Base == nil {
		log.Printf("🔴 HandleRequestCardPlant: req.Base is nil for player %d", player.GetID())
		return
	}
	if req.Base.Base == nil {
		log.Printf("🔴 HandleRequestCardPlant: req.Base.Base is nil for player %d", player.GetID())
		return
	}

	if !room.acceptInGameBase(player, req.Base.Base) {
		return
	}

	// 在调用前获取原子变量的值
	lastFrameID := player.Ctx.LatestFrameID.Load()
	lastAckFrameID := player.Ctx.LatestAckFrameID.Load()

	// 此帧想要发生的时机晚于下一帧序号
	req.Base.ProcessFrameId = room.resolveProcessFrameID(req.Base)

	if !room.CouldAffordable(player, req.Base.Base, req.Cost, 0, req.EnergySum, req.StarShardsSum, lastFrameID, lastAckFrameID) {
		// 无法负担
		return
	}
	operation := room.Logic.PlantCard(player, req)
	room.recordOperationSubmission(req.Base.ProcessFrameId, operation)
	room.pruneFrameHistory()
	room.syncAllClients()
}

func (room *Room) HandleRequestRemovePlant(player *Player, req *messages.RequestRemovePlant) {
	// 检查 req 和其嵌套字段是否为 nil
	if req == nil {
		log.Printf("🔴 HandleRequestRemovePlant: req is nil for player %d", player.GetID())
		return
	}
	if req.Base == nil {
		log.Printf("🔴 HandleRequestRemovePlant: req.Base is nil for player %d", player.GetID())
		return
	}
	if req.Base.Base == nil {
		log.Printf("🔴 HandleRequestRemovePlant: req.Base.Base is nil for player %d", player.GetID())
		return
	}

	if !room.acceptInGameBase(player, req.Base.Base) {
		return
	}
	// 此帧想要发生的时机晚于下一帧序号
	req.Base.ProcessFrameId = room.resolveProcessFrameID(req.Base)

	operation := room.Logic.RemoveCard(player, req)
	room.recordOperationSubmission(req.Base.ProcessFrameId, operation)
	room.pruneFrameHistory()
	room.syncAllClients()
}

func (room *Room) HandleRequestStarShards(player *Player, req *messages.RequestStarShards) {
	// 检查 req 和其嵌套字段是否为 nil
	if req == nil {
		log.Printf("🔴 HandleRequestStarShards: req is nil for player %d", player.GetID())
		return
	}
	if req.Base == nil {
		log.Printf("🔴 HandleRequestStarShards: req.Base is nil for player %d", player.GetID())
		return
	}
	if req.Base.Base == nil {
		log.Printf("🔴 HandleRequestStarShards: req.Base.Base is nil for player %d", player.GetID())
		return
	}

	if !room.acceptInGameBase(player, req.Base.Base) {
		return
	}

	// 在调用前获取原子变量的值
	lastFrameID := player.Ctx.LatestFrameID.Load()
	lastAckFrameID := player.Ctx.LatestAckFrameID.Load()

	// 此帧想要发生的时机晚于下一帧序号
	req.Base.ProcessFrameId = room.resolveProcessFrameID(req.Base)

	if !room.CouldAffordable(player, req.Base.Base, 0, req.Cost, req.EnergySum, req.StarShardsSum, lastFrameID, lastAckFrameID) {
		// 无法负担
		return
	}
	operation := room.Logic.UseStarShards(player, req)
	room.recordOperationSubmission(req.Base.ProcessFrameId, operation)
	room.pruneFrameHistory()
	room.syncAllClients()
}

func (room *Room) HandleRequestEndGame(player *Player, req *messages.RequestEndGame) {
	// 只能在 STAGE_InGame 阶段处理
	if !room.GameStage.EqualTo(constants.STAGE_InGame) {
		return
	}

	// 之后进入 PostGame 阶段
	room.GameStage.Store(constants.STAGE_PostGame)
	if room.RoomCtx.GameTicker != nil {
		room.RoomCtx.GameTicker.Stop()
		room.RoomCtx.GameTicker = nil
	}
	room.resetInGameState()
	// 广播game end
	payload := messages.ResponseGameEnd{
		GameResult: req.GameResult,
	}
	resp := &messages.RoomResponse{
		Payload: &messages.RoomResponse_GameEnd{
			GameEnd: &payload,
		},
	}
	room.RoomCtx.BroadcastMessage(resp, nil)

	// 重置房间允许下一场游戏
}
