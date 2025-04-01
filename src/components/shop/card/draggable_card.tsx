import React from 'react';
import FortuneCard, { FortuneCardProps } from './card';
import { useGesture } from '@use-gesture/react';
import { animated, useSpring } from '@react-spring/web';

interface DraggableFortuneCardProps extends FortuneCardProps {}

const DraggableFortuneCard: React.FC<DraggableFortuneCardProps> = (cardData) => {
    const [springProps, setSpring] = useSpring(() => ({
        x: 0,
        y: 0,
        rotateX: 0,
        rotateY: 0,
        scale: 1,
        config: { mass: 5, tension: 350, friction: 40 }
    }));

    const bind = useGesture({
        onDrag: ({ down, movement: [mx, my] }) => {
            const rotateX = down ? my / 10 : 0;
            const rotateY = down ? mx / 10 : 0;
            const scale = down ? 1.05 : 1;
            setSpring({
                x: down ? mx : 0,
                y: down ? my : 0,
                rotateX,
                rotateY,
                scale
            });
        }
    });

    return (
        <animated.div
            {...bind()}
            style={{
                // 使用 perspective 和 translate3d 实现 3D 效果
                transform: springProps.x
                    .to((x) => `perspective(1000px) translate3d(${x}px, ${springProps.y.get()}px, 0)`)
                    .to((trans) =>
                        `${trans} rotateX(${springProps.rotateX.get()}deg) rotateY(${springProps.rotateY.get()}deg) scale(${springProps.scale.get()})`
                    ),
                display: 'inline-block',
                cursor: 'grab'
            }}
        >
            <FortuneCard {...cardData} />
        </animated.div>
    );
};

export default DraggableFortuneCard;
