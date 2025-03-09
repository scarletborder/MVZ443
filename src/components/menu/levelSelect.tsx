// levelSelect.tsx
import GenericView from './genericView';

interface Props {
    width: number;
    height?: number;
    onBack: () => void;
}

export default function LevelSelect({ width, height, onBack }: Props) {
    if (height === undefined) {
        height = width * 3 / 4;
    }

    const levels = Array.from({ length: 15 }, (_, i) => ({
        name: `关卡 ${i + 1}`,
        details: `关卡 ${i + 1} 详情\n\n难度: ${Math.ceil((i + 1) / 5)}\n敌人数量: ${(i + 1) * 10}\n最佳时间: ${(i + 1) * 30}秒`
    }));

    return (
        <GenericView
            width={width}
            height={height}
            title="选择关卡"
            items={levels}
            onBack={onBack}
        />
    );
}
