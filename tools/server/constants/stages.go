package constants

// 游戏的各个阶段
type Stage uint8

const (
	STAGE_InLobby   Stage = 0x20 // InLobby (大厅/等待中): 房间刚被创建，等待玩家加入，房主可以设置游戏。
	STAGE_Preparing Stage = 0x21 // Preparing (准备中): 房主已发起游戏，所有玩家选择装备并确认准备。
	STAGE_InGame    Stage = 0x22 // InGame (游戏中): 所有玩家准备就绪，游戏正式开始，由50ms定时器驱动逻辑。
	STAGE_PostGame  Stage = 0x23 // PostGame (游戏后结算): 游戏结束，显示战绩，等待返回大厅。

	STAGE_CLOSED Stage = 0xEE
	STAGE_Error  Stage = 0xFF
)

func (s Stage) ForwardStage() Stage {
	switch s {
	case STAGE_InLobby:
		return STAGE_Preparing
	case STAGE_Preparing:
		return STAGE_InGame
	case STAGE_InGame:
		return STAGE_PostGame
	case STAGE_PostGame:
		return STAGE_InLobby
	default:
		return STAGE_Error
	}
}

// 是否晚于（包括）某一个阶段
func (s Stage) IsLaterThanOrEqual(target Stage) bool {
	return s >= target
}
