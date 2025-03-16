`go build -ldflags "-H=windowsgui" -o waveeditor.exe main.go`



## 技巧

### 给玩家的准备时间

Progress = 0

MinDelay是你要设置的准备时间



```json
{ 
    "waveId": 0,
    "progress": 0,
    "flag": "normal",
    "monsters": [],
    "duration": 0,
    "maxDelay": 20,
    "minDelay": 20,
    "arrangement": 1,
    "minLine": 1,
    "starShards": 0
}
```



### 阵型

arrangement: 1-均匀,2-集中

minLine: 出怪行的最小数