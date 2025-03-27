import { MIRecord } from "../../models/IRecord";
import IMutant from "../../models/monster/mutant";
import { Game } from "../../scenes/Game";
import IMutantAnim, { MutantAnimProps } from "../../sprite/zombie_mutant";

const defaultAnimProps = (scene: Game, x: number, y: number): IMutantAnim => {
    const Props: MutantAnimProps = {
        Species: "default_mutant",
        bodyKey: 'sprMutantBody',
        bodyNum: 2,
        headKey: 'sprMutantHead',
        upperArmKey: 'sprMutantUpperArm',
        lowerArmKey: 'sprMutantLowerArm',
        upperLegKey: 'sprMutantUpperLeg',
        lowerLegKey: 'sprMutantLowerLeg',

    }
    return new IMutantAnim(scene, x, y, Props);
}

function NewMutant(scene: Game, x: number, y: number, waveID: number): IMutant {
    const zomb = new IMutant(scene, x, y, waveID, defaultAnimProps);
    zomb.SetHealthFirsty(120);
    zomb.anim.setHandObject('attach/sign');
    zomb.anim.startLegSwing();
    zomb.anim.startArmSwing();
    zomb.anim.startBodySwing();
    // scene.time.delayedCall(1000, () => {
    //     zomb.anim.startThrow()
    //     scene.time.delayedCall(2000, () => {
    //         zomb.setVelocityX(0);
    //         zomb.anim.stopArmSwing()
    //         zomb.anim.stopLegSwing()
    //         zomb.anim.restoreLegsToInitial()
    //         zomb.anim.startLeftArmSmash()
    //         scene.time.delayedCall(2000, () => {
    //             zomb.setVelocityX(-20 * scene.positionCalc.scaleFactor);
    //             zomb.anim.startLegSwing()
    //         });

    //     })

    // })
    zomb.SetSpeedFirstly(20);
    zomb.StartMove();
    return zomb;
}

export const MutantRecord: MIRecord = {
    mid: 15,
    name: "突变僵尸",
    NewFunction: NewMutant,
    texture: 'zombie/zombie',
    weight(waveId?: number) {
        return 1;
    },
    level: 7,
    leastWaveID: 10,
}