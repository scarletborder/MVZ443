/**
 * 
 * const (
	STAGE_InLobby   Stage = 0x20 // InLobby (大厅/等待中): 房间刚被创建，等待玩家加入，房主可以设置游戏。
	STAGE_Preparing Stage = 0x21 // Preparing (准备中): 房主已发起游戏，所有玩家选择装备并确认准备。
	STAGE_Loading   Stage = 0x22 // Loading (加载中): 游戏开始前的加载阶段，所有玩家准备完毕后进入 InGame。
	STAGE_InGame    Stage = 0x23 // InGame (游戏中): 所有玩家准备就绪，游戏正式开始，由50ms定时器驱动逻辑。
	STAGE_PostGame  Stage = 0x24 // PostGame (游戏后结算): 游戏结束，显示战绩，等待返回大厅。

	STAGE_CLOSED Stage = 0xEE
	STAGE_Error  Stage = 0xFF
)

 */
enum EnumGameStage {
    InLobby = 0x20,   // 大厅/等待中
    Preparing = 0x21, // 准备中
    Loading = 0x22,   // 加载中
    InGame = 0x23,    // 游戏中
    PostGame = 0x24,  // 游戏后结算
    Closed = 0xEE,    // 房间已关闭
    Error = 0xFF      // 发生错误
}

export default EnumGameStage;