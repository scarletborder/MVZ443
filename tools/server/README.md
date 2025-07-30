## 房间架构

### app

游戏服务器, 维护网络服务器,房间管理器,以及其他服务

### room manager

房间管理器, 维护所有原子房间 ctx

### room atom

使用状态机控制房间状态, 在非"游戏场景"时使用被动方式管理游戏状态

在"正在游戏"场景时, 按照游戏逻辑帧循环来消费接收到的消息和发送消息

原子房间, 维护一个游戏逻辑

## 游戏逻辑

### 建立房间和准备工作

第一个用户建立 ws 连接后发送\*requestJoin,服务器返回\_RoomInfo

如果\_RoomInfo.peer length 为 0,说明当前没有其他玩家,这是第一个用户

期间,第二个用户可以进入房间,返回的\_RoomInfo.peer 不空,前端知道这个用户只能等待选择不了地图

接着第一个用户选择地图,发送\_requestChooseMap,服务器记录这个信息, 再次广播\_RoomInfo //发送 \_ChooseMap 给所有用户

接着前端收到消息后通知用户开始选择卡片,选择完后用户发送 \_requestStartGame,

待所有用户选择卡片结束后,用户加载地图,加载完后用户发送\_ready

所有用户\_ready 后,服务器为所有用户发送\_GameStart, 其中每个用户收到的消息的 myId 不同,seed 是服务器随机生成的 number

用户收到\_GameStart 后游戏正式开始\*

### 游戏主循环

进入游戏主循环

服务器在 接收 goroutine 中接受所有用户发来的\_requestCardPlant, \_requestRemovePlant, \_requestStarShards,
进行简单的逻辑判断(这里简单设置为最先来的消息占据了某个 col,row,如果后续消息中有相同 col,row 那么失效),如果有效加入一个待发送 list

发送 goroutine, 每 200ms 将 command list 组装成自己的协议 message 并发给每个用户

#### 采用 lockstep(如果没有和服务端同步,直接锁客户端)

这里主管了如何处理用户发来的 command message

服务端维护,服务器 frameID, 所有用户的当前 ID

-   每服务器帧循环,自增 frameID,将缓存中的所有 msg(msg.frameID == svc.frameID)发送,. 接着阻塞,直到所有用户的 ID 都等于服务器的 ID
-   每个用户客户端,当服务器帧时间到,自增 frameID,
    -   循环处理 recvQueue, 对于 frameID 等于客户端 id 的帧,直接处理了.如果没有这样的帧,那么暂停游戏.
    -   当 recvQueue 消费流程结束后,发送我已经接收到了这个帧的 frameID
-   每个用户端的 sendQueue 直接立刻发送,frameID 是当前的 frameID

-   每次用户发来 command message,比对该 message 的 ID 是否小于服务器维护该用户的 frameID,如果晚,直接丢弃.
    -   每次用户发来'我已经接收到服务器帧', 更新这个用户的当前 ID 为`max(用户当前ID,frameID)`

#### 模拟运行

假设服务器帧间隔 100ms

golang 的 interval 设置后,第 0s 不会执行,

当 100ms 时, 服务器的 id 为 0(default),user1 的 id 为 0(default). 服务器 ID 自增,服务器消费缓存中所有 frameID 为 1 的帧

