## boss

boss存在时,召唤小弟的逻辑在boss内部实现

一个Boss wave类似,这里Mid为1的是boss,spawner只管实例化他并为他赋予boss属性,放boss onkilled, 那么游戏进入判断结束.(其他如失败照旧,因为都是进屋失败). boss(以及之后elite)属性进屋不会判失败

boss和elite的区别是,elite wave的boss死亡后,游戏继续. boss wave的boss死亡后,游戏结束

```json
{
    "waveId": 1,
    "progress": 10,
    "flag": "boss",
    "monsters": [
        {
            "mid": 1,
            "count": 1
        }
    ],
    "duration": 8,
    "maxDelay": 36,
    "minDelay": 29,
    "arrangement": 1,
    "minLine": 1,
    "starShards": 0,
    "exceptLine": null
}
```

