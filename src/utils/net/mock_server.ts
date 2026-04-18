// 单机游戏下的模拟服务器 - Echo 实现
// 游戏外+游戏内模拟服务器行为

// TODO: 实现帧计数器

import { Request } from "../../pb/request";


/**
 * MockServer - Echo 服务器
 * 直接回显客户端发送的请求作为响应
 */
class MockServer {
  private isRunning: boolean = false;

  constructor() {
    this.isRunning = false;
  }

  /**
   * 启动模拟服务器
   */
  start() {
    this.isRunning = true;
    console.log("MockServer started in echo mode");
  }

  /**
   * 停止模拟服务器
   */
  stop() {
    this.isRunning = false;
    console.log("MockServer stopped");
  }

  /**
   * Echo 处理 - 直接返回接收到的消息
   * @param message 接收到的二进制消息
   * @returns 回显的二进制消息
   */
  handleMessage(message: Uint8Array): Uint8Array {
    if (!this.isRunning) {
      console.warn("MockServer is not running");
      return new Uint8Array(0);
    }

    try {
      // 解析接收到的请求
      const request = Request.fromBinary(message);
      console.log("MockServer received request:", request);

      // Echo 模式：直接返回原始消息
      // 在实际应用中，这里可以根据请求类型生成对应的响应
      return message;
    } catch (e) {
      console.error("MockServer: Failed to parse message:", e);
      return new Uint8Array(0);
    }
  }

  /**
   * 检查服务器是否运行
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

// 导出单例
const mockServer = new MockServer();

export default mockServer;
export { MockServer };