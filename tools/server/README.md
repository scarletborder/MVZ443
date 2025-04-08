## 逻辑

### 建立房间和准备工作

第一个用户建立ws连接后发送_requestJoin,服务器返回_RoomInfo
如果_RoomInfo.peer length为0,说明当前没有其他玩家,这是第一个用户
期间,第二个用户可以进入房间,返回的_RoomInfo.peer 不空,前端知道这个用户只能等待选择不了地图
接着第一个用户选择地图,发送_requestChooseMap,服务器记录这个信息, 再次广播_RoomInfo   //发送 _ChooseMap 给所有用户
接着前端收到消息后通知用户开始选择卡片,选择完后用户发送 _requestStartGame, 
待所有用户选择卡片结束后,用户加载地图,加载完后用户发送_ready
所有用户_ready后,服务器为所有用户发送_GameStart, 其中每个用户收到的消息的myId不同,seed是服务器随机生成的number
用户收到_GameStart后游戏正式开始_

### 游戏主循环

进入游戏主循环
服务器在 接收goroutine 中接受所有用户发来的_requestCardPlant, _requestRemovePlant,  _requestStarShards,
进行简单的逻辑判断(这里简单设置为最先来的消息占据了某个col,row,如果后续消息中有相同col,row那么失效),如果有效加入一个待发送list

发送goroutine, 每200ms将command list组装成自己的协议message并发给每个用户

#### 采用lockstep(如果没有和服务端同步,直接锁客户端)

这里主管了如何处理用户发来的command message

服务端维护,服务器frameID, 所有用户的当前ID

- 每服务器帧循环,自增frameID,将缓存中的所有msg(msg.frameID == svc.frameID)发送,. 接着阻塞,直到所有用户的ID都等于服务器的ID
- 每个用户客户端,当服务器帧时间到,自增frameID,
  - 循环处理recvQueue, 对于frameID等于客户端id的帧,直接处理了.如果没有这样的帧,那么暂停游戏.
  - 当recvQueue消费流程结束后,发送我已经接收到了这个帧的frameID
- 每个用户端的sendQueue直接立刻发送,frameID是当前的frameID

- 每次用户发来command message,比对该message的ID是否小于服务器维护该用户的frameID,如果晚,直接丢弃. 
  - 每次用户发来'我已经接收到服务器帧', 更新这个用户的当前ID为`max(用户当前ID,frameID)`

#### 模拟运行

假设服务器帧间隔100ms

golang的interval设置后,第0s不会执行,

当100ms时, 服务器的id为0(default),user1的id为0(default). 服务器ID自增,服务器消费缓存中所有frameID为1的帧
