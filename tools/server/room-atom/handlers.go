package roomatom

import (
	"encoding/json"
	"log"
	"mvzserver/clients"
	"mvzserver/constants"
	messages "mvzserver/messages/pb"
	"mvzserver/utils"

	"runtime/debug"

	"github.com/gofiber/websocket/v2"
	"google.golang.org/protobuf/proto"
)

type Player = clients.Player
type PlayerMessage = clients.PlayerMessage

// WS入口
func (room *Room) HandleClientJoin(c *websocket.Conn) {
	ctx := room.RoomCtx.CreateClientCtxFromConn(c)
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
	utils.WriteLobbyResponse(c, &resp)

	// 创建一个新的玩家实例
	p := clients.NewPlayer(ctx, room.incomingMessages)
	room.register <- &p // 将玩家加入到注册通道
	return
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

		// 制作当前peers信息json
		// peers = [{"addr" : string, "id": int}, ...]
		type PeerInfo struct {
			Addr string `json:"addr"`
			Id   int    `json:"id"`
		}
		var peers []PeerInfo
		room.RoomCtx.Players.Range(func(uid int, player *clients.Player) bool {
			peers = append(peers, PeerInfo{
				Addr: player.Ctx.Conn.RemoteAddr().String(),
				Id:   player.Ctx.Id,
			})
			return true
		})
		jsonPeers, _ := json.Marshal(peers)
		jsonPeersStr := string(jsonPeers)

		// 进行一次广播
		room.RoomCtx.Players.Range(func(uid int, player *clients.Player) bool {
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
			room.RoomCtx.SendMessageToUserByPlayer(&messages.RoomResponse{
				Payload: &messages.RoomResponse_RoomInfo{
					RoomInfo: &payload,
				},
			}, player)
			return true
		})

		// 开始服务,开goroutine
		go room.StartServeClient(player)
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
		resp := &messages.RoomResponse{
			Payload: &messages.RoomResponse_AllReady{
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
		resp := &messages.RoomResponse{
			Payload: &messages.RoomResponse_UpdateReadyCount{
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
	resp := &messages.RoomResponse{
		Payload: &messages.RoomResponse_ChooseMap{
			ChooseMap: &payload,
		},
	}
	room.RoomCtx.BroadcastMessage(resp, nil)
}

func (room *Room) HandleRequestLeaveChooseMap(player *Player, req *messages.RequestLeaveChooseMap) {
	// 只有房主能这样做
	if room.RoomCtx.OwnerUserID != player.Ctx.Id {
		return
	}
	// 只能在 STAGE_Preparing 阶段处理
	if !room.GameStage.EqualTo(constants.STAGE_Preparing) {
		return
	}
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
		resp := &messages.RoomResponse{
			Payload: &messages.RoomResponse_AllLoaded{
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

func (room *Room) HandleRequestCardPlant(player *Player, req *messages.RequestCardPlant) {
	if !room.HandleRequestBlank(player, req.Base.Base) {
		return
	}
	// 此帧想要发生的时机晚于下一帧序号
	req.Base.ProcessFrameId = max(room.RoomCtx.NextFrameID.Load(), req.Base.ProcessFrameId)

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
	// 此帧想要发生的时机晚于下一帧序号
	req.Base.ProcessFrameId = max(room.RoomCtx.NextFrameID.Load(), req.Base.ProcessFrameId)

	room.Logic.RemoveCard(player, req)
}

func (room *Room) HandleRequestStarShards(player *Player, req *messages.RequestStarShards) {
	if !room.HandleRequestBlank(player, req.Base.Base) {
		return
	}
	// 此帧想要发生的时机晚于下一帧序号
	req.Base.ProcessFrameId = max(room.RoomCtx.NextFrameID.Load(), req.Base.ProcessFrameId)

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
	resp := &messages.RoomResponse{
		Payload: &messages.RoomResponse_GameEnd{
			GameEnd: &payload,
		},
	}
	room.RoomCtx.BroadcastMessage(resp, nil)

	// 重置房间允许下一场游戏
}
