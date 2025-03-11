// CQ 码是一种特殊的文本格式，用于在选择关卡页面中插入文字,图片
interface cqItem {
    type: 'text' | 'image';
    data: string;
}

interface cqMessage {
    items: cqItem[];
}