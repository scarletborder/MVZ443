```ts
// 导入生成的类型和 I/O 对象
import { Request, RequestCardPlant } from './gen/request'; // 文件名没有 _pb 后缀了
import { Response, GameStart } from './gen/response';

// sendPlantRequest 演示如何编码一个请求
function sendPlantRequest(): Uint8Array {
  // 1. 创建消息对象，可以直接用对象字面量，非常方便！
  const plantRequest: RequestCardPlant = {
    uid: 101,
    pid: 42,
    level: 1,
    col: 3,
    row: 5,
    frameId: 120
  };

  // 2. 将具体消息包装进 Request 消息的 oneof 字段中
  const wrapperRequest: Request = {
    payload: {
      oneofKind: 'plant', // oneofKind 属性用于指定类型
      plant: plantRequest
    }
  };

  console.log('[TS Frontend] Encoding Request: Plant card');
  // 3. 使用生成的 I/O 对象进行编码
  const binaryData = Request.toBinary(wrapperRequest);
  
  return binaryData;
}

// handleServerResponse 演示如何解码来自服务器的二进制数据
function handleServerResponse(data: Uint8Array) {
  // 使用生成的 I/O 对象进行解码
  const response = Response.fromBinary(data);

  // oneof 的处理也更直观
  switch (response.payload.oneofKind) {
    case 'gameStart':
      // 直接访问 payload.gameStart，类型安全
      const gameStartMsg = response.payload.gameStart;
      console.log(`[TS Frontend] Decoded Response: GameStart! Seed: ${gameStartMsg.seed}, MyID: ${gameStartMsg.myId}`);
      break;

    case 'roomInfo':
      const roomInfo = response.payload.roomInfo;
      console.log(`[TS Frontend] Decoded Response: RoomInfo. LordID: ${roomInfo.lordId}, Peers: ${roomInfo.peer.join(', ')}`);
      break;
    
    case undefined:
      console.log('[TS Frontend] Received a response with no payload.');
      break;

    default:
      console.log('[TS Frontend] Received an unknown or unhandled response type.');
      break;
  }
}

// ... main 函数不变 ...
function main() {
  const requestData = sendPlantRequest();
  console.log(`[TS Frontend] Final binary data to send to server (len: ${requestData.length}):`, requestData);
  console.log("--------------------------------");

  const gameStart: GameStart = { seed: 12345678, myId: 101 };
  const mockResponse: Response = {
    payload: {
      oneofKind: 'gameStart',
      gameStart: gameStart
    }
  };
  const responseData = Response.toBinary(mockResponse);
  handleServerResponse(responseData);
}

main();
```



```go
package main

import (
	"fmt"
	"log"

	// 导入生成的包，pb 是常用别名
	pb "your_project/backend/gen" // 请将 your_project 替换为你的 Go module 名称

	"google.golang.org/protobuf/proto"
)

// handleRequest 演示如何解码来自客户端的二进制数据
func handleRequest(data []byte) {
	// 创建一个空的 Request 消息实例
	req := &pb.Request{}

	// 使用 proto.Unmarshal 将二进制数据解码到消息实例中
	if err := proto.Unmarshal(data, req); err != nil {
		log.Printf("Failed to unmarshal request: %v", err)
		return
	}

	// 使用 switch 语句安全地处理 oneof 字段
	// req.GetPayload() 会返回一个接口，其具体类型是 oneof 中被设置的那个字段
	switch payload := req.GetPayload().(type) {
	case *pb.Request_Plant:
		plantInfo := payload.Plant
		fmt.Printf("[Go Backend] Decoded Request: Plant card. UID: %d, PID: %d, Pos: (%d, %d)\n",
			plantInfo.GetUid(), plantInfo.GetPid(), plantInfo.GetCol(), plantInfo.GetRow())
		// 在这里执行你的游戏逻辑...

	case *pb.Request_Ready:
		readyInfo := payload.Ready
		fmt.Printf("[Go Backend] Decoded Request: Player is ready. UID: %d\n", readyInfo.GetUid())

	default:
		fmt.Printf("[Go Backend] Received an unknown or unhandled request type: %T\n", payload)
	}
}

// createGameStartResponse 演示如何编码一个响应并返回二进制数据
func createGameStartResponse() ([]byte, error) {
	// 1. 创建具体的响应消息
	gameStartMsg := &pb.GameStart{
		Seed: 12345678,
		MyId: 101,
	}

	// 2. 将具体消息包装进 Response 消息的 oneof 字段中
	response := &pb.Response{
		Payload: &pb.Response_GameStart{
			GameStart: gameStartMsg,
		},
	}

	fmt.Println("[Go Backend] Encoding Response: GameStart")
	// 3. 使用 proto.Marshal 将消息编码为二进制数据
	return proto.Marshal(response)
}

func main() {
	// --- 模拟场景 ---

	// 1. 模拟一个客户端发来的“请求种植卡片”的二进制数据
	mockPlantRequest := &pb.Request{
		Payload: &pb.Request_Plant{
			Plant: &pb.RequestCardPlant{
				Uid:     101,
				Pid:     42,
				Level:   1,
				Col:     3,
				Row:     5,
				FrameId: 120,
			},
		},
	}
	// 将模拟请求编码为二进制，这等同于从网络接收到的 data
	requestData, err := proto.Marshal(mockPlantRequest)
	if err != nil {
		log.Fatalf("Failed to marshal mock request: %v", err)
	}

	// 2. 后端接收并处理这个请求
	handleRequest(requestData)

	fmt.Println("--------------------------------")

	// 3. 后端决定游戏开始，并创建一个 GameStart 响应
	responseData, err := createGameStartResponse()
	if err != nil {
		log.Fatalf("Failed to create response: %v", err)
	}

	// 4. responseData 就是你要通过 WebSocket 或 TCP 发送给客户端的 []byte
	fmt.Printf("[Go Backend] Final binary data to send to client (len: %d): %x\n", len(responseData), responseData)
}
```