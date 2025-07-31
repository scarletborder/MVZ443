// encode.go
package messages

import (
	"errors"
)

// Encodable 接口定义了任何可以被序列化为二进制的消息。
// 请求和响应消息的结构体都将实现此接口。
type Encodable interface {
	Encode() ([]byte, error)
}

// EncodeMessage 接收一个 ResponseMessage，并调用其自身的 Encode 方法。
// 巨大的 switch 语句被移除，使得添加新消息类型不再需要修改此文件。
func EncodeMessage(msg ResponseMessage) ([]byte, error) {
	if encodable, ok := msg.(Encodable); ok {
		return encodable.Encode()
	}
	return nil, errors.New("unsupported message type: message does not implement Encodable interface")
}