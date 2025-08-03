import { Request } from "../../pb/request";

/**
 * 使用protobuf编码消息
 * @param request 请求对象
 * @returns 编码后的Uint8Array
 */
export default function encodeMessageToBinary(request: Request): Uint8Array {
  // TODO: 实现protobuf编码
  console.log('Encoding request:', request);
  return new Uint8Array();
}

/**
 * 编码并发送请求
 * @param request 请求对象
 * @returns 编码后的Uint8Array
 */
export function encodeAndSend(request: Request): Uint8Array {
  // TODO: 实现protobuf编码
  console.log('Encoding and sending request:', request);
  return new Uint8Array();
}