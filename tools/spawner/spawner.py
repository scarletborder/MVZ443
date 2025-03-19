# 在下面就绪好后执行本方法开启刷怪,返回JSON

# ---------------- 全局参数 (可变) ----------------
first_wave_id = 0            # 第一波的波数索引(不影响结果waveID), 影响后续难度
total_waves = 50               # 总波数
difficulty_limit = 60        # 最终波数达到的难度上限
phase1_end = 19               # 早期阶段结束的波数索引（波 0 到 phase1_end-1）
phase2_end = 38               # 中期阶段结束的波数索引（波 phase1_end 到 phase2_end-1）
# 后期阶段对应波数：phase2_end 到 total_waves-1

# 定义 flag wave,这些wave之前会给很充足的准备时间
flagWaves = [15 ,32, 50, 60]

# 水之道,这些路在前几波不会刷怪
waterWays = [2,3]

# 用于冒险模式,有些怪物还没有遇到,不允许刷怪
AllowedMobs = {1,2,3,4,8, 7, 11, 9}              # 允许的怪物


MobDict = {
  1: "普通僵尸",
  2: "帽子僵尸",
  3: "铁盔僵尸",
  4: "矿工僵尸",
  5: "铁盔矿工僵尸",
  6: "骷髅",
  7: "骷髅弓箭手",
  8: "撑杆僵尸",
  9: "唤魔者",
  10: "卫道士",
  11: "卫道士战士",
  12: "黑曜石傀儡"
}

MobWeight = {
    1 : 4000,
    2 : 4000,
    3 : 3000,
    4 : 3500,
    5 : 2000,
    6 : 0,
    7 : 1500,
    8 : 2000,
    9 : 1000,
    10 : 0,
    11 : 3500,
    12 : 0
}

MobLevel={    
    1 : 1,
    2 : 2,
    3 : 4,
    4 : 2,
    5 : 6,
    6 : 0,
    7 : 2,
    8 : 2,
    9 : 5,
    10 : 0,
    11 : 4,
    12 : 0
}

_total_waves = total_waves + first_wave_id # 真正的总波数
_phase1_end = phase1_end  + first_wave_id             # 早期阶段结束的波数索引（波 0 到 phase1_end-1）
_phase2_end = phase2_end  + first_wave_id             # 中期阶段结束的波数索引（波 phase1_end 到 phase2_end-1）
# 后期阶段对应波数：phase2_end 到 total_waves-1

# 定义 flag wave,这些wave之前会给很充足的准备时间
_flagWaves = []
for wave in flagWaves:
    _flagWaves.append(wave + first_wave_id)

import json
import datetime
import random
import math

# 不同波数的僵尸种类对应的权重
def GetMobWeight(mobId: int, waveId: int)->int:
    if mobId == 1:
        return max(400, MobWeight[1] - (waveId - 4) * 180)
    if mobId == 2:
        return max(1000, MobWeight[2] - (waveId - 4) * 150)
    return MobWeight[mobId]
    
# 不同波数的某个僵尸是否可以出现
def CanMobAppear(mobId: int, waveId: int)->bool:
    if mobId not in AllowedMobs: # 强制不允许刷怪
        return False
    if waveId < 4:
        return mobId == 1 or mobId == 2 or mobId == 3 or mobId == 4 # or 未来的读报僵尸(龟帽僵尸)
    if waveId < 10: 
        return mobId == 1 or mobId == 2 or mobId == 3 or mobId == 4 or (
            mobId == 8 or mobId == 11 or mobId == 7 or mobId == 9)
    if waveId < 15:
        return mobId == 1 or mobId == 2 or mobId == 3 or mobId == 4 or (
            mobId == 8 or mobId == 11 or mobId == 7 or mobId == 9) or (
                mobId == 5)
    
    return True # all ok

# 根据级别和所给权重进行生成怪物
def generateMobs(levelSum : int, waveId:int)->dict[int, int]:
    mobList = {}
    mobKeys = list(MobDict.keys())
    # 去除不可能生成的,即权重为0的
    for mobId in mobKeys:
        if MobWeight[mobId] == 0:
            mobKeys.remove(mobId)

    # 为每个怪物ID计算对应的加权权重
    weights = [GetMobWeight(mobId, waveId) for mobId in mobKeys]



    while levelSum > 1:
        # 使用加权随机选择一个怪物
        mobId = random.choices(mobKeys, weights, k=1)[0]
        # 如果这个key对应的怪物可以生成
        if CanMobAppear(mobId, waveId) and MobLevel[mobId] <= levelSum:
            # 生成这个怪物
            mobList[mobId] = mobList.get(mobId, 0) + 1
            levelSum -= MobLevel[mobId]

    # 挑选到level = 1的太难了,直接放置一个普通僵尸
    if levelSum == 1:
        mobList[1] = mobList.get(1, 0) + 1

    # 打印信息 , name - number
    # for mobId in mobList:
    #     print(MobDict[mobId], mobList[mobId])

    return mobList
    
import math
import matplotlib.pyplot as plt

# ---------------- 设计目标比例 ----------------
# 规定：
#   - 早期阶段结束时难度占 difficulty_limit 的比例
#   - 中期阶段结束时难度占 difficulty_limit 的比例
# 要求： 0 < early_ratio < mid_ratio < 1
early_ratio = 0.2   # 例如：波 phase1_end 的难度为 0.2 * difficulty_limit
mid_ratio   = 0.8   # 例如：波 phase2_end 的难度为 0.8 * difficulty_limit

# ---------------- 早期阶段: 二次函数 ----------------
# 定义形式: difficulty = a * (wave_idx)^2
# 为保证在 wave = phase1_end 时难度为 early_ratio*difficulty_limit，取：
a = (early_ratio * difficulty_limit) / (_phase1_end ** 2)

def difficulty_early(wave_idx):
    # wave_idx 在 [0, phase1_end) 内
    return a * (wave_idx ** 2)

# ---------------- 中期阶段: 指数函数 ----------------
# 定义形式: difficulty = D0 + c * (exp(k*(wave_idx - phase1_end)) - 1)
# 其中 D0 是早期结束时的难度，即 D0 = early_ratio*difficulty_limit。
# 在 wave = phase2_end 时，我们希望难度为 mid_ratio*difficulty_limit，从而解得 c：
k = 0.1  # mid 阶段增长速度常数（推荐值，可调整）
D0 = difficulty_early(_phase1_end)  # 早期阶段结束时的难度 = early_ratio*difficulty_limit
c = ( (mid_ratio * difficulty_limit) - D0 ) / (math.exp(k * (_phase2_end - _phase1_end)) - 1)

def difficulty_mid(wave_idx):
    # wave_idx 在 [phase1_end, phase2_end) 内
    return D0 + c * (math.exp(k * (wave_idx - _phase1_end)) - 1)

# ---------------- 后期阶段: Logistic 曲线 ----------------
# 采用 logistic 模型： difficulty = L / (1 + exp(-r*(wave_idx - x_mid)))
# 要求：
#   - 在 wave = phase2_end 时，难度应为 mid_ratio*difficulty_limit（即与中期衔接）
#   - 在 wave = total_waves-1 时，难度应达到 difficulty_limit
#
# 选择 late_phase 的两个边界：
A = _phase2_end                # 后期起始波
B = _total_waves - 1           # 最后一波
# 为简单起见，取 logistic 中点为 late_phase 的中心：
x_mid = (A + B) / 2

# 为满足边界条件：
#   L/(1+exp(-r*(A - x_mid))) = mid_ratio*difficulty_limit
#   L/(1+exp(-r*(B - x_mid))) = difficulty_limit
# 两式联立可以推导出：
#   exp(r*(B - A)/2) = difficulty_limit/(mid_ratio*difficulty_limit) = 1/mid_ratio
# 因此可解得 r：
r = (2 / (B - A)) * math.log(1 / mid_ratio)
# 再由第一边界条件计算 L：
L = (mid_ratio * difficulty_limit) * (1 + math.exp(-r*(A - x_mid)))
# 注意：由于 A - x_mid = -(B-A)/2，所以 exp(-r*(A-x_mid)) = exp(r*(B-A)/2) = 1/mid_ratio，
# 故 L = (mid_ratio*difficulty_limit)*(1 + 1/mid_ratio) = difficulty_limit * (mid_ratio + 1).

def difficulty_late(wave_idx):
    # wave_idx 在 [phase2_end, total_waves) 内
    return L / (1 + math.exp(-r * (wave_idx - x_mid)))

# ---------------- 综合难度函数 ----------------
def difficulty(wave_idx):
    """根据波数返回难度值，确保最后一波难度等于 difficulty_limit"""
    if wave_idx < _phase1_end:
        return difficulty_early(wave_idx)
    elif wave_idx < _phase2_end:
        return difficulty_mid(wave_idx)
    else:
        return difficulty_late(wave_idx)



# ---------------- 参数说明及调整建议 ----------------
#
# 1. 早期阶段 (波 0 ~ phase1_end-1):
#    - 公式：difficulty = a * (wave_idx)^2，
#    - a 由 early_ratio 确定：a = (early_ratio*difficulty_limit)/(phase1_end^2)。
#    - 增大 early_ratio（或减少 phase1_end）会使早期难度提高；减小则降低早期难度。
#
# 2. 中期阶段 (波 phase1_end ~ phase2_end-1):
#    - 公式：difficulty = D0 + c * (exp(k*(wave_idx-phase1_end))-1)，其中 D0 = early_ratio*difficulty_limit。
#    - 参数 k（推荐 0.1）控制曲线上升的陡峭度；c 由公式 c = ( (mid_ratio*difficulty_limit)-D0 )/(exp(k*(phase2_end-phase1_end))-1) 得到。
#    - 增大 k 或 c 将使中期难度上升更快；反之，则更平缓。
#
# 3. 后期阶段 (波 phase2_end ~ total_waves-1):
#    - 采用 Logistic 曲线：difficulty = L/(1+exp(-r*(wave_idx-x_mid)))，
#    - 其中 x_mid = (phase2_end + (total_waves-1))/2，
#    - r = (2/( (total_waves-1)-phase2_end )) * ln(1/mid_ratio)，L = difficulty_limit*(1+mid_ratio)。
#    - 此设计保证了在 wave = phase2_end 时难度为 mid_ratio*difficulty_limit，
#      且在最后一波（wave = total_waves-1）时难度恰好为 difficulty_limit。
#
# 调整全局参数或设计比例时，只要满足：
#    0 < early_ratio < mid_ratio < 1，
# 且 phase1_end < phase2_end < total_waves，
# 则代码会自动计算合适的曲线参数，确保难度平滑递增且最后波数难度达到上限。
#
# 你可以根据实际需求修改 total_waves, difficulty_limit, phase1_end, phase2_end, early_ratio, mid_ratio 以及 k，
# 代码会自动适配，保证最终输出满足设计要求。
#
# 输出部分也打印了计算得到的各阶段参数，便于你调整验证。
# print("Computed parameters:")
# print(f"a (早期阶段二次函数因子): {a}")
# print(f"c (中期阶段指数函数因子): {c}")
# print(f"k (中期阶段增长常数): {k}")
# print(f"r (后期阶段 Logistic 增长率): {r}")
# print(f"x_mid (后期阶段 Logistic 中点): {x_mid}")
# print(f"L (后期阶段 Logistic 缩放因子): {L}")


# 生成某wave的level
def getLevelSum(waveId:int)->int:
    ratio = 1
    if waveId in _flagWaves:
        ratio = 2.5
    
    return math.ceil(difficulties[waveId] * ratio)

# 生成某wave的各种时间,duration, minDelay, maxDelay
def getAllTimes(waveId:int)->tuple[int, int, int]:
    def getDuration(waveId: int):
        return 5

    duration = getDuration(waveId)

    def getMaxDelay(waveId: int):
        return 20 + random.randint(0, 5)
    
    maxDelay = getMaxDelay(waveId)

    def getMinDelay(waveId: int):
        if (waveId + 1) in _flagWaves:
            return maxDelay - 1
        return 1
    
    minDelay = getMinDelay(waveId)
    return (duration, minDelay, maxDelay)

def oneObject(waveId:int):
    if waveId == 0:
        return {
             "waveId": 0,
            "progress": 0,
            "flag": "normal",
            "monsters": [],
            "duration": 0,
            "maxDelay": 20,
            "minDelay": 18,
            "arrangement": 1,
            "minLine": 1,
            "starShards": 0,
            "exceptLine": None
        }


    obj = {}
    obj['waveId'] = waveId
    obj['flag'] = 'normal'
    obj['progress'] = math.ceil((waveId / _total_waves) * 100)
    obj['arrangement']  = 1
    
    if random.randint(0, 100) < 30:
        obj['arrangement'] = 2
        obj['minLine'] = random.randint(2, 3)

    obj['starShards'] = 0
    if waveId % 7 == 0:
        obj['starShards'] += 1

    levelSum = getLevelSum(waveId)
    duration, minDelay, maxDelay = getAllTimes(waveId)
    if waveId < 3:
        # 早期阶段,不刷水道
        obj['exceptLine'] = waterWays or None
    else:
        obj['exceptLine'] = None

    mob_dict = generateMobs(levelSum, waveId)
    obj['monsters'] = []
    for mobItem in mob_dict.items():
        obj['monsters'].append({
            'mid': mobItem[0],
            'count': mobItem[1]
        })
    obj['duration'] = duration
    obj['minDelay'] = minDelay
    obj['maxDelay'] = maxDelay
    return obj

# ---------------- 绘制难度曲线 ----------------
wave_indices = list(range(_total_waves))
difficulties = [difficulty(w) for w in wave_indices]

# plt.figure(figsize=(10, 6))
# plt.plot(wave_indices, difficulties, marker='o', linestyle='-', color='b', label='难度曲线')
# plt.axhline(y=difficulty_limit, color='r', linestyle='--', label='难度上限')
# plt.title("游戏难度随波数的变化")
# plt.xlabel("波数")
# plt.ylabel("难度")
# plt.grid(True)
# plt.legend()
# plt.show()

# 根据每个waveId,获得对应obj

ret = []

for waveId in range(0, _total_waves):
    ret.append(oneObject(waveId))

ret = ret[first_wave_id:]

# 保存到文件
# 今天日期

today = datetime.date.today()
today = today.strftime("%Y-%m-%d")
with open(f"{today}_wave.json", "w") as f:
    f.write(json.dumps(ret, indent=4))
    f.close()