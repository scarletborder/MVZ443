
export default function encodeMessageToBinary(message: _requestType, frameID?: number): Uint8Array {
    const buffer = new ArrayBuffer(16); // 固定长度
    const view = new DataView(buffer);

    view.setUint8(0, message.type);

    // 通用字段
    if ('uid' in message) view.setUint16(1, message.uid);

    // 针对不同类型结构
    switch (message.type) {
        case 0x02: // Plant
            view.setUint16(3, message.pid);
            view.setUint8(5, message.level);
            view.setUint8(6, message.col);
            view.setUint8(7, message.row);
            frameID && view.setUint16(8, frameID);
            break;

        case 0x04: // Remove
        case 0x08: // StarShard
            view.setUint16(3, message.pid);
            view.setUint8(6, message.col);
            view.setUint8(7, message.row);
            frameID && view.setUint16(8, frameID);
            break;
        case 0x03: // Blank
            frameID && view.setUint16(3, frameID); // 发送的FrameID    
            break;

        case 0x01: // Ready
            // already handled uid
            break;
        case 0x10:
            view.setUint32(3, message.chapterId);
            break;
    }

    return new Uint8Array(buffer);
}