package roomatom

// 定义room服务
// Room 结构体、状态机主循环、状态切换、房间属性和方法

import (
	"crypto/subtle"
	"mvzserver/constants"
	gamelogic "mvzserver/room-atom/game-logic" // 只能这里导入,TODO 删除 logic导入room
	"time"

	"github.com/gofiber/websocket/v2"
)

type Room struct {
	// 基础属性
	ID      int
	RoomCtx *RoomCtx
	Logic   *gamelogic.GameLogic

	// 安全
	key string // 房间密钥

	// 游戏状态
	GameStage  constants.Stage
	ChapterID  int32
	ReadyCount int32
	Seed       int32

	LastActiveTime time.Time // 上次活动时间

	// 网络
	FrameID uint16 // 当前帧ID
}

func (r *Room) HandleClientJoin(c *websocket.Conn) {

	// TODO: 重置加入的逻辑， 应该是 r.register <-
	// TODO： 加入短线重连机制,.具体见我和gemini对话

	// 添加并新建一个client context
	clientCtx := r.RoomCtx.AddUser(c)

	// 关闭连接时清理用户
	defer r.RoomCtx.DelUser(clientCtx.Id)
	defer c.Close()

	// 广播信息： 用户加入
	r.RoomCtx.BroadcastUserJoin(clientCtx.Id)

	// 开始服务
	r.StartServeClient(c)
}

/* 属性操作 */

func (r *Room) GetPlayerCount() int {
	// 已在 ctxManager 内部使用 Range 进行计数
	return r.RoomCtx.GetPlayerCount()
}

func (r *Room) CheckKeyCorrect(key string) bool {
	// 检查密钥是否正确
	// 时长无关的检查（异或）
	return subtle.ConstantTimeCompare([]byte(r.key), []byte(key)) == 1
}

// 设置房间密钥
func (r *Room) SetKey(key string) {
	r.key = key
}

func (r *Room) HasKey() bool {
	// 检查是否有密钥
	return r.key != ""
}
