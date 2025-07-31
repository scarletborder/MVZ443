// decode.go
package messages

import (
	"errors"
	"fmt"
	"reflect"
)

// decodableRequest 是一个内部接口，定义了所有可解码请求消息必须实现的方法。
type decodableRequest interface {
	RequestMessage
	Decode(data []byte) error
}

// requestMessageFactory 是一个函数类型，用于创建 decodableRequest 的实例。
type requestMessageFactory func() decodableRequest

// requestMessageRegistry 是消息类型到其工厂函数的映射（注册表）。
var requestMessageRegistry = make(map[int]requestMessageFactory)

// init 函数在包初始化时自动执行，用于填充注册表。
func init() {
	registerRequestMessage(MsgTypeBlank, func() decodableRequest { return &RequestBlank{} })
	registerRequestMessage(MsgTypeRequestCardPlant, func() decodableRequest { return &RequestCardPlant{} })
	registerRequestMessage(MsgTypeRequestRemovePlant, func() decodableRequest { return &RequestRemovePlant{} })
	registerRequestMessage(MsgTypeRequestStarShards, func() decodableRequest { return &RequestStarShards{} })
	registerRequestMessage(MsgTypeReady, func() decodableRequest { return &Ready{} })
	registerRequestMessage(MsgTypeRequestChooseMap, func() decodableRequest { return &RequestChooseMap{} })
	registerRequestMessage(MsgTypeRequestEndGame, func() decodableRequest { return &RequestEndGame{} })
}

// registerRequestMessage 向注册表中添加一个新的消息类型。
// 如果消息类型已存在，则会引发 panic，以在开发早期捕获错误。
func registerRequestMessage(msgType int, factory requestMessageFactory) {
	if _, exists := requestMessageRegistry[msgType]; exists {
		panic(fmt.Sprintf("message type %d already registered", msgType))
	}
	requestMessageRegistry[msgType] = factory
}

// DecodeBinaryMessage 使用工厂模式从二进制数据中解码消息。
// 它保持了原始的函数签名，返回解码后的消息值（非指针）。
func DecodeBinaryMessage(data []byte) (int, interface{}, error) {
	if len(data) < 1 {
		return -1, nil, errors.New("data too short")
	}

	msgType := int(data[0])
	factory, ok := requestMessageRegistry[msgType]
	if !ok {
		return -1, nil, fmt.Errorf("unknown message type: 0x%X", msgType)
	}

	// 从工厂创建一个新的消息实例（指针类型）
	msg := factory()
	// 调用实例自身的解码方法
	if err := msg.Decode(data); err != nil {
		return -1, nil, fmt.Errorf("failed to decode message type 0x%X: %w", msgType, err)
	}

	// 为了匹配原始函数返回非指针类型的行为，我们在这里解引用。
	// 这确保了对外部代码的兼容性。
	return msgType, reflect.ValueOf(msg).Elem().Interface(), nil
}

// As 是一个类型安全的泛型辅助函数。
// 它可以将 interface{} 类型转换为指定的具体类型，避免了繁琐的类型断言。
// 用法: specificMsg, ok := As[RequestCardPlant](decodedMsg)
func As[T any](v any) (T, bool) {
	typedVal, ok := v.(T)
	return typedVal, ok
}
