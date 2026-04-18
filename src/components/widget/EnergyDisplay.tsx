import { useEffect, useState, useRef } from 'react';
import { useThrottleFn } from 'ahooks';
import { publicUrl } from '../../utils/browser';
import useDarkMode from '../../hooks/useDarkMode';
import ResourceManager from '../../game/managers/combat/ResourceManager';
import PlantsManager from '../../game/managers/combat/PlantsManager';

interface EnergyDisplayProps {
  /** 布局方向 */
  direction: 'vertical' | 'horizontal';
}

export function EnergyDisplay({ direction }: EnergyDisplayProps) {
  const isDarkMode = useDarkMode();
  const [energy, setEnergy] = useState(0);
  const [isEnergyInsufficient, setIsEnergyInsufficient] = useState(false);

  const insufficientTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // 监听能量变化
  useEffect(() => {
    const offListenEnergy = ResourceManager.Instance.Eventbus.on('onEnergyUpdate', (
      newEnergy: number,
      playerId: number
    ) => {
      // 假设只展示自己的能量
      if (playerId === ResourceManager.Instance.mineId) {
        setEnergy(newEnergy);
      }
    });

    return () => {
      offListenEnergy();
    };
  }, []);

  // 处理能量不足提示
  const { run: handleEnergyInsufficient } = useThrottleFn(() => {
    setIsEnergyInsufficient(true);

    if (insufficientTimeoutRef.current) {
      clearTimeout(insufficientTimeoutRef.current);
    }

    insufficientTimeoutRef.current = setTimeout(() => {
      setIsEnergyInsufficient(false);
    }, direction === 'vertical' ? 350 : 800);
  }, { wait: direction === 'vertical' ? 400 : 500 });

  useEffect(() => {
    // 监听能量不足事件
    const offListenInsufficient = PlantsManager.Instance.EventBus.on('onEnergyInsufficient',
      handleEnergyInsufficient);

    return () => {
      offListenInsufficient();
      if (insufficientTimeoutRef.current) {
        clearTimeout(insufficientTimeoutRef.current);
      }
    };
  }, [handleEnergyInsufficient]);

  if (direction === 'vertical') {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: isDarkMode ? '#333' : '#f0f0f0',
        width: '6%',
        minWidth: "6%",
        maxWidth: '150px',
        height: "100%",
        padding: '10px',
        color: 'black',
        textAlign: 'center',
        paddingTop: '5px',
        paddingBottom: '15px'
      }}>
        <div style={{
          position: 'relative',
          display: 'inline-block',
          width: '65px',
          height: '65px',
          marginBottom: '-5px'
        }}>
          <img src={`${publicUrl}/assets/sprite/redstone.png`} alt="energy"
            style={{
              width: '42px',
              height: '42px',
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              marginBottom: 0
            }}
            draggable="false" />
        </div>
        <p style={{
          fontSize: '1.6em',
          color: isEnergyInsufficient
            ? '#F44336'
            : (isDarkMode ? '#e0e0e0' : 'black'),
          margin: '0',
          marginTop: '-3px',
          transition: 'color 0.3s ease'
        }}>{energy}</p>
      </div>
    );
  }

  // horizontal layout
  return (
    <div style={{
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDarkMode ? '#333' : '#f0f0f0',
      width: '100%',
      padding: '5px 10px',
      color: 'black',
      textAlign: 'center',
      gap: '8px'
    }}>
      <div style={{
        position: 'relative',
        display: 'inline-block',
        width: '60px',
        height: '60px'
      }}>
        <img src={`${publicUrl}/assets/sprite/redstone.png`} alt="energy"
          style={{
            width: '40px',
            height: '40px',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}
          draggable="false" />
      </div>
      <p style={{
        margin: 0,
        fontSize: '1.5em',
        color: isEnergyInsufficient
          ? '#F44336'
          : (isDarkMode ? '#e0e0e0' : 'black'),
        transition: 'color 0.3s ease',
        marginTop: '-2px'
      }}>{energy}</p>
    </div>
  );
}
