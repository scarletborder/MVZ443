import React from 'react';

export interface FortuneCardProps {
    index: number; // 第几番
    level: string; // 运势等级，如“小吉”
    description: {
        main: string;    // 主描述，如“霧の中で見つかる妖精”
        sub: string;     // 称号，如“大妖精”
        ability: string; // 能力描述，如“霧を泳ぐ程度の能力”
    };
    comment: string; // 侧边评论，例如“名字が無くたって気にしないね。...”
    details?: Record<string, string>; // 运势详情数据
    extras: string;
}

const FortuneCard: React.FC<FortuneCardProps> = ({
    index,
    level,
    description,
    comment,
    details,
    extras,
}) => {
    const containerStyle: React.CSSProperties = {
        margin: '10px',
        width: '90%',
        padding: '6px',
        backgroundColor: '#2f2f2f',
        backgroundImage: `linear-gradient( #D0104C, #D0104C),
                      linear-gradient( #D0104C, #D0104C),
                      linear-gradient( #D0104C, #D0104C),
                      linear-gradient( #D0104C, #D0104C),
                      linear-gradient( #D0104C, #D0104C),
                      linear-gradient( #D0104C, #D0104C),
                      linear-gradient( #D0104C, #D0104C),
                      linear-gradient( #D0104C, #D0104C)`,
        backgroundPosition: `top center, top 4.5px center, bottom center, bottom 4.5px center,
                         center left, center left 4.5px, center right, center right 4.5px`,
        backgroundSize: `90% 3px, 90% 1.5px, 90% 3px, 90% 1.5px, 3px 100%, 1.5px 100%, 3px 100%, 1.5px 100%`,
        backgroundRepeat: 'no-repeat',
    };

    const cellStyle: React.CSSProperties = {
        padding: '15px 5px',
        textAlign: 'center',
    };

    const verticalTextStyle: React.CSSProperties = {
        padding: '15px 5px',
    };

    const detailCellStyle: React.CSSProperties = {
        textAlign: 'left',
        padding: '15px 20px',
    };

    return (
        <table style={containerStyle} cellSpacing={0} cellPadding={5}>
            <tbody>
                {/* 第一行：编号和等级 */}
                <tr style={{ textAlign: 'center' }}>
                    <td
                        style={{
                            ...cellStyle,
                            backgroundImage: 'linear-gradient( #D0104C, #D0104C)',
                            backgroundPosition: 'center right',
                            backgroundSize: '2px 80%',
                            backgroundRepeat: 'no-repeat',
                        }}
                    >
                        <div>
                            第 <big>{index}</big> 番
                        </div>
                    </td>
                    <td style={cellStyle}>
                        <div>
                            <big>{level}</big>
                        </div>
                    </td>
                </tr>
                {/* 第二行：描述区域 */}
                <tr style={{ textAlign: 'center' }}>
                    <td
                        colSpan={2}
                        style={{
                            ...cellStyle,
                            whiteSpace: 'nowrap',
                            backgroundImage:
                                'linear-gradient( #D0104C, #D0104C), linear-gradient( #D0104C, #D0104C), linear-gradient( #D0104C, #D0104C)',
                            backgroundPosition: 'top 0 center, bottom 0 center, bottom 5px center',
                            backgroundSize: '95% 2px, 95% 3.5px, 95% 1.5px',
                            backgroundRepeat: 'no-repeat',
                        }}
                    >
                        <div>{description.main}</div>
                        <div>
                            <big>{description.sub}</big>
                        </div>
                        <div>{description.ability}</div>
                    </td>
                </tr>
                {/* 第三行：侧边竖排评论 */}
                <tr>
                    <td
                        colSpan={2}
                        style={{
                            ...verticalTextStyle,
                            backgroundImage: 'linear-gradient( #D0104C, #D0104C)',
                            backgroundPosition: 'bottom 0 center',
                            backgroundSize: '95% 2px',
                            backgroundRepeat: 'no-repeat',
                        }}
                    >
                        <div>
                            <big>{comment}</big>
                        </div>
                    </td>
                </tr>
                {/* 第四行：运势详情 */}
                <tr>
                    <td
                        colSpan={2}
                        style={{
                            ...detailCellStyle,
                            backgroundImage: 'linear-gradient( #D0104C, #D0104C)',
                            backgroundPosition: 'bottom 0 center',
                            backgroundSize: '80% 2px',
                            backgroundRepeat: 'no-repeat',
                        }}
                    >
                        {details &&
                            Object.entries(details).map(([key, value]) => (
                                <div key={key}>
                                    {key}：{value}
                                </div>
                            ))}
                    </td>
                </tr>
                {/* 第五行：额外提示 */}
                <tr>
                    <td colSpan={2} style={{ ...detailCellStyle }}>
                        {extras}
                    </td>
                </tr>
            </tbody>
        </table>
    );
};

export default FortuneCard;
