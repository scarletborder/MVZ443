export type _Typedebuffs = 'slow' | 'frozen' | null;

export type _TypeArrowEnhancement = 'none' | 'fire' | 'ice' | 'lightning';
export function EnhancementPriority(new_en: _TypeArrowEnhancement, old_en: _TypeArrowEnhancement): boolean {
    const priority = {
        'none': 0,
        'ice': 1,
        'fire': 2,
        'lightning': 3
    };
    return priority[new_en] > priority[old_en];
}


export const ProjectileDamage = {
    arrow: 20,
    firework: 2000,

}