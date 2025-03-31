export default {
    ice_bomb_description: `消耗: 75
爆炸,并且冻结全屏敌人,并在解冻后减速敌人一段时间
无法对其使用星之碎片
寒冰炸弹一直想摆脱人们对他是控制卡片的固有看法,于是他拼命锻炼,现在他有伤害了
提升等级可以略微提高伤害
5级 - 大幅度增加造成的伤害(惩罚:能量消耗增加至100)
9级 - 减少冷却时间
`
    ,
    sg4: `深入矿洞视野不断开阔,这里出现的怪物更加强力并且数量更加庞大.

铁匠: 真是奇怪,月光发电机这个时候竟然坏了,否则上一关就会发给你的. 不过好在我收集了一些配件改装了一下,现在它可以自动工作了,不过...
Alex: 不过什么?
铁匠: 不过,你需要借助外力不断摇他
Alex: 汗...那你上场摇他吗
铁匠:这不是有怪物帮我们摇吗,把他种在前面就好了.顺便一提,我终于找到了扩展我们器械背包的方法,现在可以你可以在商店中解锁第7个卡槽了
`
    ,
    start: '开始游戏'
    ,
    generator_description: `消耗:50
被僵尸攻击时,将怪物的动能转化为机械能
技能:唤醒周围3x3的所有器械
光敏作物,睡眠时能量转化效率大幅度降低
低矮器械
生命:中
铁匠在收拾steve遗留的器械时找到了月光传感器,但是光伏板已经损坏,于是给他添加了一个脚踏板,这样就可以借助怪物的力量发电了,但是代价又是什么呢?
提升等级可以略微提升生命值
5级 - 白天的能量转化效率中幅度提高
9级 - 提高全天候的能量转化效率
`
    ,
    at_dispenser: `消耗:450
向前发射高伤害的烟花火箭,命中怪物会造成爆炸
需要种植在发射器上
技能:向前发射一枚短引信烟花火箭,销毁时释放集束炸弹
派出一名HellVillager操纵威力强大的手动炮台,可摧毁远距离装甲目标
升级可以中幅度提高器械生命值
5级: 消耗减少到425
9级:冷却时间小幅度减少`
    ,
    obsidian_description: `消耗: 50
黑曜石的强力装甲能够抵御僵尸的攻击。
技能：恢复所有生命值，并获得更加坚硬的护甲
生命：高
这块黑曜石是人造的
提升等级可以略微提升生命值
5级 - 中幅度减少冷却时间
9级 - 星之碎片装甲抗性大幅度提高`
    ,
    scb: `黯绯结晶Trailer Version Only`
    ,
    sg3: `解决完毕了聚集在矿洞外围的怪物后,二人继续前行

Alex:矿洞内的刷怪量与外边的世界比起来可不是差了一点两点,就像放了过去overworld的十几个刷怪笼
铁匠:看来全overworld的怪物的消失与那个叫做幻想乡的异世界脱不了干系,我们继续前进.另外,如果你发觉现有的器械对抗这些怪物稍有吃力,可以在我这里使用原材料为他们升级.
Alex:呀,真感谢你的帮助,只要继续前进就好了，只要不停下脚步，道路就会...不断延伸?呃呃呃,这黑灯瞎火的地方太阳能板停止运作了,还好光敏植物可以开始运作
--- 关卡特性 ---
能量100`
    ,
    furnace_description: `消耗: 50
熔炉能为你自动生产红石
技能：生成大量红石
提供机械能：中等
铁匠在原有熔炉的基础上安装了一个连着发电机的矿车轨道，这样就可以自动将红石转化为机械能了
提升等级可以略微减少产能间隔
5级 - 减少能量消耗至35
9级 - 每次产能提高至40`
    ,
    update_log: `v0.0.4a
2025.3.29:第一章体验版再次的更新
- 完成了第一章的BOSS关卡先锋关卡
- 重新编排了关卡的顺序,现在关卡的顺序是[虹龙洞]:[两个Elite关卡]
-新器械:三线发射器和反坦克炮台,前者可以通关[虹龙洞]或者两个Elite关卡进行解锁,后者可以在商店中解锁
- 新怪物种类:突变僵尸,他们在游戏后期出现,有着毁灭性的攻击能力
- 累计平衡性更新和bug修复,全体的僵尸移动速度小幅度降低

v0.0.3b
2025.3.21: 第一章体验版第三次更新part B
- 完成了第一章第二个精英关,现在你可以在矿洞深处(水elite)和???进行对战
- 重做了刷怪机制,现在的刷怪机制更类似PVZ1的无尽模式.    
- 难度依然在重置中,请期待后续平衡性更新
v0.0.3a
2025.3.19: 第一章体验版第二次更新part A
- 完成了第一章的第一个精英关,现在你可以在"矿道(elite)"和???进行对战
- 累计平衡性更新,现在器械和怪物的数值介于MVZ expand版本的hard与lunatic之间,当然考虑器械等级的话,难度会更低.
- 累计bug更新
- 器械:广域南瓜派,寒冰炸弹
. 另外更新了一些器械的描述.
- 怪物: 撑杆僵尸,唤魔者,卫道士(替换原来的僵尸猪人,僵尸猪人将在未来的版本上线)
- 开发者工具方面,新增了tools/spawner,你可以在docs中关于spawner看到他的说明
v0.0.2
2025.3.15: 第一章体验版更新
- 完成了第一章除精英关和Boss关以外的关卡,当前版本出怪表难度可能不合理
- 器械:发射器,熔炉,黑曜石,地雷TNT,小发射器,睡莲,瞬炸TNT,生物质发电机,阴森南瓜头,魔术粉
- 怪物:僵尸,皮帽僵尸,铁盔僵尸,矿工僵尸,铁盔矿工僵尸,骷髅弓箭手
- 游戏外强化功能尚未实装,材料机制尚未实装,你可以通过修改游戏存档文件来实现植物的手动升级,大部分器械的升级效果尚未实装.
- 下一次实装怪物: 撑杆僵尸,僵尸猪人,唤魔者
v0.0.1 - 初始版本发布
- 3种器械,2种僵尸,2种bullet
- 包含测试关卡
- 图鉴
- 存档管理
- 出怪表机制
2025.3.7: 启程`
    ,
    iron: `铁锭`
    ,
    sg6: `清理完残留在洞穴水层的怪物,他们在湖水中找到了一条通往更深层次的间隙,间隙中散射着七彩的光芒

铁匠:这绚烂的光彩不可能是我们Minecraft的东西,我预感这底下绝对有着和异空间的连接
Alex: Let's move!

二人戴上龟帽僵尸掉落的海龟壳帽,凭借着水下呼吸效果进行深浅,初极狭,才通人,复潜数十步,豁然开朗.七彩的龙珠镶嵌在岩壁上.

Alex:这些,不是Minecraft的矿物!
(深处传来怪物的嘶吼,其中夹杂着低沉的叹息)
铁匠:看来又有一场苦仗要打了`
    ,
    gatlin_dispenser: `消耗:425
单行倾泻密集的箭矢
需要种植在发射器上
技能:短时间内提高箭矢伤害.
派出一名HellVillager操纵手动炮台,强悍的火力能有效对单行轻型目标进行绝对的压制.Kill them all!!!
升级可以略微增加器械生命值
5级:消耗降低至375
9级:中幅度降低冷却时间`
    ,
    small_dispenser_description: `消耗: 0
小型发射器能发射短距离的雪球。
技能：射出一个长距离爆炸雪球
伤害：中等
光敏作物,睡眠状态不攻击
低矮器械
雪球里包着石头，别问了。
提升等级可以略微提升攻击伤害
5级 - 攻击范围中幅度增加
9级 - 强光环境不会失效
`
    ,
    triple_dispenser_description: `消耗:325
向前方三路分别发射1/1/1发子弹
技能: 向前方扇形区域散射240发箭矢(刹華月翔)

三线发射器是铁匠根据坑爹村民留下的三头发射器魔改而来,解决了原版箭矢散射的问题,仅占一格的情况下可以对三路发起攻击
铁匠自豪的称呼他为单兵能力最强的全自动发射器器械

升级可以略微提高攻击伤害
3级：向前方三路分别发射1/2/1发子弹
5级:  穿透+1(惩罚:能量消耗提高到350)
9级：向前方三路分别发射2/2/2发子弹`
    ,
    sg5: `继续前进,地下积水形成的天然湖泊挡住了前进的路
铁匠: 别慌,用新获得的睡莲承载器械,另外如果你有多余的材料还可以在商店中扩展第8个卡槽

--- 关卡特性 ---
2,3水路
`
    ,
    cp1: `这个故事发生在Steve与坑爹村民前往永夜沼泽后的第二度花信.
作为留守在村庄中的Alex非常担心Steve...
而与此同时,overworld到处刷怪量急剧减少,机器由于原材料的短缺逐渐停工,工业化的村庄面临着无法供养庞大村民的问题.
是时候站出来解决这场overworld的异变了.`
    ,
    tnt_mines_description: `消耗: 25
地雷TNT在一定时间的装填后能够炸飞接近的僵尸。
技能:向前方生成两颗已经部署好的TNT地雷
伤害：极高
地雷TNT为什么需要时间来填装？这的确是个千古难题。如果它能瞬间出来的话那还怕什么呢？但在它看来，这件事挺正常的。用它的话来说，就是“老子在睡觉！
提升等级可以略微减少部署时间
5级 - 冷却时间小幅度减少
7级 - 星之碎片能力可以多生成一个TNT地雷
9级 - 爆炸范围向前略微扩大
`
    ,
    sg7: `[难度依然在平衡中]

Alex: 该死,这些突变僵尸真难对付
铁匠: 我想是这些来自异世界的龙珠导致了僵尸的变异.另外,这些异世界的龙珠的神奇力量可以让你拓展第9个卡槽了
Alex:这里绝对有通往异世界线索的

二人又花了一段时间去寻找,最终还是没有找到与异世界相关的线索,因此回到了这矿道中
Alex:啊,这矿洞根本没有和幻想乡连接的道路吗~
铁匠:根据我的记忆,呃呃呃(此时二人的眼前出现了一大块黑曜石),不过之前来的时候有这块石头挡路吗?(拿起铁镐敲击)
(敲击的声音引起了洞穴里怪物的注意)
Alex:小心,那群怪物来了,辛亏之前摆放在这里的器械还没有回收,我来撑住他们.
--- 关卡特性 ---
能量50,开局2列赠送3个熔炉
--- 精英波 ---
Alex: 终于重新摆平那些怪物了,铁匠你那里进展如何
(寂静)
Alex:铁匠!铁匠!该死那块黑色东西是什么
(???上场)
`
    ,
    obsidian_medal: `黑曜石残骸`
    ,
    sg2: `在将村庄防务问题解决给自动化器械和其他村民后,Alex和铁匠踏上了寻找Steve的路
Alex:还记得Steve他们离开时的场景吗?当时他们兴奋地展示了一张地图,指着永夜沼泽兴奋的说,前往那里就能去往传说中的幻想乡
铁匠:是的,但是现在那处已经被改造成了女巫塔,而施工队没有发现任何结界波动的迹象.不过我还知道一处可能存在时空信道的入口...就是附近的一处矿洞的底层,曾经我做冒险者的时候去过那里.
Alex:你看好多僵尸聚集在那里,还有些僵尸在闪烁发光,我预感击败他们可以获得短时间增强植物能力的重要道具.
`
    ,
    lily_description: `消耗:25
为你承载植物
2月8日、18日、28日这三天带8的日子是爱莲之日哦
升级可以略微提升生命值
5级 - 能量消耗减少至0`
    ,
    pumpkin_description: `消耗:100
向前发射中距离激光造成大范围伤害
技能:前方三行发射中等伤害激光(无法对空)
光敏作物,睡眠状态不攻击
铁匠拾起了steve丢下的灵魂熔炉,但是由于overworld中怪物数量的减少,刷怪塔已经无法提供充足的燃烧弹,因此铁匠给他塞入了由绯色金属制作的手电筒可以循环发射贯穿激光
提高等级可以略微提高伤害
5级 - 加速攻击
9级 - 攻击造成减速效果(惩罚:消耗增加至150)`
    ,
    dispenser_description: `消耗: 100
发射器是你的第一道防线，它们发射箭来保卫你的房子。
技能：朝前方发射大量箭矢
伤害：中等
“有人问我为什么我能不需要红石就能发射箭，还有人问我为什么我能发射无数的箭。”发射器顿了一顿，“第一，我的栅栏连着一个脉冲，第二，我内部的弓附有耐久450和无限I。啥？你问我为啥会说话？
提升等级可以略微提升攻击伤害
3级 - 所有箭矢可以穿透一个目标(每穿透一个目标惩罚当前50%伤害)
5级 - 星之碎片能力箭矢多穿透一个目标(惩罚: 星之碎片箭矢伤害小幅度降低)
9级 - 降低消耗至75
`
    ,
    sg9: `在一番苦战之后,二人终于击败了warden
铁匠:这warden发出的音波可快把我耳膜弄炸了
Alex:安啦,现在幻想乡在向我们招手,只要用这把审稿...
(远处传来怪物嘶吼)
Alex:看来那些怪物不想简简单单的放我们离开

--- 先锋怪物结束 ---
Alex: 芜湖,这些螳臂挡车的mob们已经被钢铁器械创的灰飞烟灭,现在可以摧毁这些挡路的黑曜石了
(第1次敲击,黑曜石纹丝不动)
Alex:啊嗯?
铁匠:据我观察,黑曜石混杂了这些神代矿石,即使是审稿也要多敲几下.
(第10次敲击,黑曜石有了些许裂纹)
Alex:起效了哦耶
(一旁的沙砾和碎石砖块刹那间化为齑粉,一眼望去脚下是万劫不复的深渊,崩塌的声音传遍整个洞窟)
Alex:唉等等!
铁匠:先停一停,那些怪物他们又来了

--- 精英波1结束 ---
(黑曜石傀儡上场)
Alex:唉唉唉,怎么他又来了
铁匠:这些怪物一定在守护着什么东西

--- 精英波2结束 ---
铁匠:怎么我的眼前又开始闪烁了
(warden上场)
Alex:我们的打斗声音太大诱导了上面的幽匿尖啸体,那个可怕的warden又来了

--- 精英波3结束 ---
Alex:看来这些mob又重新消停了,审稿...启动!

空荡的洞穴回响着黑曜石的挖掘声音,但是此时,细细簌簌的声音传来

(???上场)
???:终于查到这里了,你们这些妄想侵略幻想乡的方块怪物,看招!
铁匠:Alex小心!`
    ,
    leather: `皮革`
    ,
    magic_powder_description: `消耗:150
对一个格子内的所有怪物造成高额(激光属性)伤害并获得一个星之碎片
无法对其使用星之碎片
粉状器械可以随意在有承载物的地块上放置
铁匠为了解决怪物战利品短缺危机而在永夜沼泽兴建刷怪塔时发现了魔术箱,但是他已经无法正常打开闭合.于是铁匠将他的核心器件和萤石混合磨成了粉,可以对怪物造成伤害的同时生成星之碎片了.
提升等级可以小幅度提高伤害
5级 - 减少花费至125
9级 - 小幅度减少冷却时间
`
    ,
    sg1: `自从Steve离开后,平日里袭击村庄的怪物数量在逐日减少
Alex: 你说Steve出门冒险后,overworld里的怪物种群在变小,这是否意味着Steve他们遇到了更多的怪物?
铁匠: 我猜想你是对的,Steve可能确实遇到了棘手的麻烦,虽然他的实力很强并且还有图书管理员伴他左右
Alex:我们需要去帮助他们!用这些遗留的器械!
铁匠wait,他们来了,现在放置你的器械抵御他们,同时重拾过去的使用经验吧.
--- 关卡特性 ---
能量50,开局1列赠送2个发射器,2列赠送3个熔炉`
    ,
    gold: `金币`
    ,
    sg8: `Alex发现黑曜石傀儡用黑曜石禁锢住铁匠,并派出怪物向自己发动了攻击,随着激烈的战斗打响,Alex最后成功解救了铁匠.并且二人在被怪物吞没前敲破了黑曜石墙,发现了一个隐秘的洞穴空腔,这里竖立着一把附魔下界合金镐
.

Alex:哇袄!是宝藏附魔的效率VI,审稿!
铁匠:还记得之前的七彩洞窟中的黑曜石吗,我猜想可以用这把镐子挖出继续向下的路

二人继续向前行走,回到了洞穴水层,这里依旧是一片湖泊,但是和过去不同的是地表布满黑色的脉络,一道道音波此起彼伏.

Alex: 没想到这矿洞下面别有一番洞天
铁匠: 奇怪,之前来的时候可没有这些地形.
Alex:哦哦,这是1.18洞穴更新改的.我们击败的怪物太多,溢出的经验会让一种叫做幽匿催发体的东西蔓延这些黑色脉络.
铁匠: 为什么我感觉我的视野在一亮一闪,那个发出尖啸声音的东西是什么
Alex: 快停下!!!他对声音敏感!!!!!
--- 关卡特性 ---
2,3水路,初始能量100
`
    ,
    echo_shard: `回响碎片`
    ,
    tnt_description: `消耗:150
TNT可以在3x3范围内造成高额爆炸伤害
技能: 在爆炸前使用星之碎片可以向周边造成同等的2次同等的TNT爆炸
为什么MVZ443少了驱动这一游戏机制,因为scarletborder根本没有拓展这个接口哈哈哈哈.
升级可以略微减少冷却时间
5级-伤害增加30%
7级-爆炸后原地留下短时间的集束炸弹,3秒后再次爆炸`
    ,
    pumpkin_wan_description: `消耗:325
向周围发射高频激光(无法对空)
需要种植在阴森南瓜头上
光敏作物,睡眠时停止攻击
技能:在周围造成一段时间的持续爆炸(升级无法扩大范围,死亡后依然有效)
如果你觉得广域南瓜派这个名字过于学术,你可以叫他另外一个名字胖平文.
提升等级 可以略微提高伤害
5级 - 减少消耗到275
7级 - 海陆空三线管制(惩罚:消耗增加至300)
9级 - 攻击范围扩大到5x5(惩罚:冷却时间小幅度延长)
`
    ,
}
