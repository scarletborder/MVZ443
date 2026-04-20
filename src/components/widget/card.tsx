import React, { useState, useEffect } from 'react';
import { useMemoizedFn } from 'ahooks';
import { publicUrl } from '../../utils/browser';
import { useLocaleMessages } from '../../hooks/useLocaleMessages';
import CardpileManager from '../../game/managers/combat/CardpileManager';
import ResourceManager from '../../game/managers/combat/ResourceManager';
import PlantsManager from '../../game/managers/combat/PlantsManager';
import { PlantModel } from '../../game/models/PlantModel';

export interface CardProps {
  plantModel: PlantModel;
  level: number;
}

export default function Card({ plantModel, level }: CardProps) {
  const { pid, texturePath, nameKey, cost: costStat } = plantModel;
  const cost = costStat.getValueAt(level);
  const [leftCooldownPercent, setLeftCooldownPercent] = useState(1);
  const [reloaded, setReloaded] = useState(false);

  const [isChosen, setIsChosen] = useState(false);
  const [energy, setEnergy] = useState(0); // 从 ResourceManager 获取能量

  const { translate } = useLocaleMessages();

  const handleDeselect = useMemoizedFn((data: { pid: number | null }) => {
    if (data.pid !== pid) {
      setIsChosen(false);
    }
  });

  useEffect(() => {
    // 监听能量变化
    const offListen1 = ResourceManager.Instance.Eventbus.on('onEnergyUpdate', (
      newEnergy: number,
      playerId: number
    ) => {
      if (playerId === ResourceManager.Instance.mineId) {
        setEnergy(newEnergy);
      }
    });

    // 监听冷却变化
    const offListen2 = CardpileManager.Instance.EventBus.on('onCooldownStatus', (status: Map<number, {
      hasReloaded: boolean;
      leftPercent: number;
    }>) => {
      const cardStatus = status.get(pid);
      if (cardStatus) {
        setLeftCooldownPercent(cardStatus.leftPercent);
        setReloaded(cardStatus.hasReloaded);
      }
    })
    return () => {
      offListen1();
      offListen2();
    };
  }, []);



  useEffect(() => {
    const offListen1 = CardpileManager.Instance.EventBus.on('onChosenCard', (chosenPid: number) => {
      if (chosenPid === pid) {
        setIsChosen(true);
        console.log(`Card ${nameKey} (pid=${pid} level=${level}) chosen`);
      } else {
        setIsChosen(false);
      }
    });
    const offListen2 = CardpileManager.Instance.EventBus.on('onChosenPickaxe', () => {
      setIsChosen(false);
    });
    const offListen3 = CardpileManager.Instance.EventBus.on('onChosenStarShards', () => {
      setIsChosen(false);
    });
    const offListen4 = CardpileManager.Instance.EventBus.on('onCancelChosen', () => {
      setIsChosen(false);
    });
    return () => {
      offListen1();
      offListen2();
      offListen3();
      offListen4();
    };
  }, [handleDeselect]); // 依赖于 memoized 函数

  const handleClick = useMemoizedFn(() => {
    if (energy < cost) {
      console.log('Not enough energy');
      PlantsManager.Instance.EventBus.emit('onEnergyInsufficient');
      return;
    }

    if (!reloaded) {
      console.log('Card is cooling down');
      return;
    }

    if (isChosen) {
      CardpileManager.Instance.cancelSelection();
      return;
    }

    CardpileManager.Instance.ClickCard(pid, level);
  });

  return (
    <button
      className={`card ${reloaded ? '' : 'cooling'} 
                ${isChosen ? 'chosen' : ''} 
                ${(energy < cost) ? 'expensive' : ''}`}
      onClick={handleClick}
      disabled={!reloaded}
    >
      <div className="card-content">
        <div className="plant-name">{translate(nameKey)}</div>
        <div className="plant-image">
          {texturePath && texturePath !== "" && (
            <img
              src={`${publicUrl}/assets/card/${texturePath}.png`}
              alt={nameKey}
              style={{
                width: "100%",
                height: "100%",
              }}
              draggable="false"
            />
          )}
        </div>
        <div className="plant-cost">{cost}</div>
      </div>

      {!reloaded && (
        <div
          className="cooldown-overlay"
          style={{
            // 使用剩余时间和冷却时间的比率来设置高度
            transform: `scaleY(${leftCooldownPercent})`,
            transformOrigin: 'bottom'
          }}
        />
      )}

    </button>
  );
}
