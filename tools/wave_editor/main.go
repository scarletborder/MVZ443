package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"strconv"
	"strings"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/dialog"
	"fyne.io/fyne/v2/storage"
	"fyne.io/fyne/v2/widget"
)

// -------------- 数据结构定义 --------------

type Monster struct {
	Mid   int `json:"mid"`
	Count int `json:"count"`
}

type Wave struct {
	WaveId      int       `json:"waveId"`
	Progress    int       `json:"progress"`
	Flag        string    `json:"flag"`
	Monsters    []Monster `json:"monsters"`
	Duration    int       `json:"duration"`
	MaxDelay    int       `json:"maxDelay"`
	MinDelay    int       `json:"minDelay"`
	Arrangement int       `json:"arrangement"` // 1: 均匀, 2: 集中
	MinLine     int       `json:"minLine"`
	StarShards  int       `json:"starShards"`
	ExceptLine  []int     `json:"exceptLine"`
}

type Reward struct {
	Type  int `json:"type"`
	Count int `json:"count"`
}

type ProgressReward struct {
	Progress int    `json:"progress"`
	Reward   Reward `json:"reward"`
}

type OnWin struct {
	UnLock      []int `json:"unLock"`
	UnLockPlant []int `json:"unLockPlant"`
}

type StageData struct {
	Comment string           `json:"comment"` // 没有实质意义
	Rows    int              `json:"rows"`
	Type    int              `json:"type"`
	Waves   []Wave           `json:"waves"`
	OnWin   OnWin            `json:"onWin"`
	Energy  int              `json:"energy"`
	Rewards []ProgressReward `json:"rewards"`
}

// -------------- 全局变量 --------------

var stageData *StageData

// 映射配置：若配置了值（非空）则在列表中显示对应名称
var monsterNames = map[int]string{}    // mid -> monster name
var rewardTypeNames = map[int]string{} // reward type -> name
var stageTypeNames = map[int]string{}  // stage type -> name

// 定义全局主容器（左右分栏），用于刷新右侧内容时不影响左侧列表
var mainSplit *container.Split

// -------------- 主函数 --------------

func main() {
	a := app.New()
	w := a.NewWindow("Stage Editor")
	w.Resize(fyne.NewSize(1000, 600))

	// 右侧内容区（随左侧选择更新）
	rightPanel := container.NewStack(widget.NewLabel("请导入或新建一个 StageData"))

	// 左侧列表：Basic, Wave, OnWin, Rewards
	sections := []string{"Basic", "Wave", "OnWin", "Rewards"}
	list := widget.NewList(
		func() int { return len(sections) },
		func() fyne.CanvasObject { return widget.NewLabel("template") },
		func(i widget.ListItemID, o fyne.CanvasObject) {
			o.(*widget.Label).SetText(sections[i])
		},
	)
	list.OnSelected = func(id widget.ListItemID) {
		if stageData == nil {
			dialog.ShowInformation("提示", "请先导入或新建 StageData", w)
			return
		}
		section := sections[id]
		mainSplit.Trailing = getSectionContent(section, w)
		mainSplit.Refresh()
	}

	// 主界面布局：左侧列表 + 右侧内容
	mainSplit = container.NewHSplit(list, rightPanel)
	mainSplit.SetOffset(0.2)

	// “文件”菜单：导入、新建、保存
	fileMenu := fyne.NewMenu("文件",
		fyne.NewMenuItem("导入", func() {
			openDialog := dialog.NewFileOpen(func(reader fyne.URIReadCloser, err error) {
				if err != nil {
					dialog.ShowError(err, w)
					return
				}
				if reader == nil {
					return
				}
				data, err := ioutil.ReadAll(reader)
				if err != nil {
					dialog.ShowError(err, w)
					return
				}
				var sd StageData
				if err := json.Unmarshal(data, &sd); err != nil {
					dialog.ShowError(err, w)
					return
				}
				stageData = &sd
				dialog.ShowInformation("成功", "文件已导入", w)
			}, w)
			openDialog.SetFilter(storage.NewExtensionFileFilter([]string{".json"}))
			if cwd, err := os.Getwd(); err == nil {
				if lister, err := storage.ListerForURI(storage.NewFileURI(cwd)); err == nil {
					openDialog.SetLocation(lister)
				}
			}
			openDialog.Show()
		}),
		fyne.NewMenuItem("新建", func() {
			stageData = &StageData{
				Comment: "新建 StageData",
				Rows:    6,
				Type:    1,
				Energy:  50,
				Waves:   []Wave{},
				OnWin:   OnWin{UnLock: []int{}, UnLockPlant: []int{}},
				Rewards: []ProgressReward{},
			}
			dialog.ShowInformation("新建", "已创建新的 StageData", w)
		}),
		fyne.NewMenuItem("保存", func() {
			if stageData == nil {
				dialog.ShowInformation("提示", "没有数据可保存", w)
				return
			}
			saveDialog := dialog.NewFileSave(func(uc fyne.URIWriteCloser, err error) {
				if err != nil {
					dialog.ShowError(err, w)
					return
				}
				if uc == nil {
					return
				}
				data, err := json.MarshalIndent(stageData, "", "    ")
				if err != nil {
					dialog.ShowError(err, w)
					return
				}
				_, err = uc.Write(data)
				if err != nil {
					dialog.ShowError(err, w)
					return
				}
				uc.Close()
				dialog.ShowInformation("成功", "文件已保存", w)
			}, w)
			saveDialog.SetFileName("stage.json")
			saveDialog.Show()
		}),
	)

	// “配置”菜单：配置全局映射
	configMenu := fyne.NewMenu("配置",
		fyne.NewMenuItem("配置映射", func() {
			showConfigDialog(w)
		}),
	)

	w.SetMainMenu(fyne.NewMainMenu(fileMenu, configMenu))
	w.SetContent(mainSplit)
	w.ShowAndRun()
}

// -------------- 各部分内容函数 --------------

// 根据 section 返回对应编辑内容
func getSectionContent(section string, win fyne.Window) fyne.CanvasObject {
	var content fyne.CanvasObject
	switch section {
	case "Basic":
		content = getBasicContent(win)
	case "Wave":
		content = getWaveContent(win)
	case "OnWin":
		content = getOnWinContent(win)
	case "Rewards":
		content = getRewardsContent(win)
	default:
		content = widget.NewLabel("未知部分")
	}
	// 修改处：使用 NewMax 包装，使内容填满右侧区域
	return container.NewMax(content)
}

// Basic 部分：编辑 Rows, Type, Energy
func getBasicContent(win fyne.Window) fyne.CanvasObject {
	if stageData == nil {
		return widget.NewLabel("没有数据")
	}
	rowsEntry := widget.NewEntry()
	rowsEntry.SetText(fmt.Sprintf("%d", stageData.Rows))
	typeEntry := widget.NewEntry()
	typeEntry.SetText(fmt.Sprintf("%d", stageData.Type))
	energyEntry := widget.NewEntry()
	energyEntry.SetText(fmt.Sprintf("%d", stageData.Energy))
	commentEntry := widget.NewEntry()
	commentEntry.SetText(stageData.Comment)

	form := widget.NewForm(
		widget.NewFormItem("Rows", rowsEntry),
		widget.NewFormItem("Type", typeEntry),
		widget.NewFormItem("Energy", energyEntry),
		widget.NewFormItem("Comment", commentEntry),
	)
	saveButton := widget.NewButton("更新", func() {
		if r, err := strconv.Atoi(rowsEntry.Text); err == nil {
			stageData.Rows = r
		}
		if t, err := strconv.Atoi(typeEntry.Text); err == nil {
			stageData.Type = t
		}
		if e, err := strconv.Atoi(energyEntry.Text); err == nil {
			stageData.Energy = e
		}
		stageData.Comment = commentEntry.Text
		dialog.ShowInformation("更新", "Basic 信息已更新", win)
	})
	return container.NewVBox(form, saveButton)
}

// Wave 部分：每个 Wave 的各项参数以及内部 Monsters 列表
func getWaveContent(win fyne.Window) fyne.CanvasObject {
	if stageData == nil {
		return widget.NewLabel("没有数据")
	}
	wavesContainer := container.NewVBox()
	// 遍历每个 Wave
	for i, wave := range stageData.Waves {
		index := i
		waveLabel := widget.NewLabel(fmt.Sprintf("Wave %d", wave.WaveId))
		progressEntry := widget.NewEntry()
		progressEntry.SetText(fmt.Sprintf("%d", wave.Progress))
		flagEntry := widget.NewEntry()
		flagEntry.SetText(wave.Flag)
		durationEntry := widget.NewEntry()
		durationEntry.SetText(fmt.Sprintf("%d", wave.Duration))
		maxDelayEntry := widget.NewEntry()
		maxDelayEntry.SetText(fmt.Sprintf("%d", wave.MaxDelay))
		minDelayEntry := widget.NewEntry()
		minDelayEntry.SetText(fmt.Sprintf("%d", wave.MinDelay))
		arrangementEntry := widget.NewEntry()
		arrangementEntry.SetText(fmt.Sprintf("%d", wave.Arrangement))
		minLineEntry := widget.NewEntry()
		minLineEntry.SetText(fmt.Sprintf("%d", wave.MinLine))
		starShardsEntry := widget.NewEntry()
		starShardsEntry.SetText(fmt.Sprintf("%d", wave.StarShards))
		exceptLine := widget.NewEntry()
		exceptLine.SetText(intSliceToString(wave.ExceptLine))

		// Monsters 子列表
		monstersContainer := container.NewVBox()
		for j, monster := range wave.Monsters {
			mIndex := j
			midEntry := widget.NewEntry()
			midEntry.SetText(fmt.Sprintf("%d", monster.Mid))
			countEntry := widget.NewEntry()
			countEntry.SetText(fmt.Sprintf("%d", monster.Count))
			monsterName := ""
			if name, ok := monsterNames[monster.Mid]; ok && name != "" {
				monsterName = " (" + name + ")"
			}
			midLabel := widget.NewLabel("Monster ID" + monsterName)
			hbox := container.NewHBox(midLabel, midEntry, widget.NewLabel("Count"), countEntry)
			updateMonster := widget.NewButton("更新", func() {
				if mid, err := strconv.Atoi(midEntry.Text); err == nil {
					stageData.Waves[index].Monsters[mIndex].Mid = mid
				}
				if cnt, err := strconv.Atoi(countEntry.Text); err == nil {
					stageData.Waves[index].Monsters[mIndex].Count = cnt
				}
				dialog.ShowInformation("更新", "Monster 更新成功", win)
			})
			hbox.Add(updateMonster)
			monstersContainer.Add(hbox)
		}
		addMonsterBtn := widget.NewButton("添加 Monster", func() {
			newMonster := Monster{Mid: 0, Count: 1}
			stageData.Waves[index].Monsters = append(stageData.Waves[index].Monsters, newMonster)
			// 更新右侧内容，不替换整个窗口
			mainSplit.Trailing = getWaveContent(win)
			mainSplit.Refresh()
		})

		form := widget.NewForm(
			widget.NewFormItem("Progress", progressEntry),
			widget.NewFormItem("Flag", flagEntry),
			widget.NewFormItem("Duration", durationEntry),
			widget.NewFormItem("MaxDelay", maxDelayEntry),
			widget.NewFormItem("MinDelay", minDelayEntry),
			widget.NewFormItem("Arrangement", arrangementEntry),
			widget.NewFormItem("MinLine", minLineEntry),
			widget.NewFormItem("StarShards", starShardsEntry),
			widget.NewFormItem("ExceptLine (逗号分隔)", exceptLine),
		)
		updateWaveBtn := widget.NewButton("更新 Wave", func() {
			if p, err := strconv.Atoi(progressEntry.Text); err == nil {
				stageData.Waves[index].Progress = p
			}
			stageData.Waves[index].Flag = flagEntry.Text
			if d, err := strconv.Atoi(durationEntry.Text); err == nil {
				stageData.Waves[index].Duration = d
			}
			if md, err := strconv.Atoi(maxDelayEntry.Text); err == nil {
				stageData.Waves[index].MaxDelay = md
			}
			if ld, err := strconv.Atoi(minDelayEntry.Text); err == nil {
				stageData.Waves[index].MinDelay = ld
			}
			if arr, err := strconv.Atoi(arrangementEntry.Text); err == nil {
				stageData.Waves[index].Arrangement = arr
			}
			if ml, err := strconv.Atoi(minLineEntry.Text); err == nil {
				stageData.Waves[index].MinLine = ml
			}
			if ss, err := strconv.Atoi(starShardsEntry.Text); err == nil {
				stageData.Waves[index].StarShards = ss
			}
			stageData.Waves[index].ExceptLine = stringToIntSlice(exceptLine.Text)
			dialog.ShowInformation("更新", fmt.Sprintf("Wave %d 更新成功", stageData.Waves[index].WaveId), win)
		})
		waveBox := container.NewVBox(waveLabel, form, updateWaveBtn,
			widget.NewLabel("Monsters:"), monstersContainer, addMonsterBtn, widget.NewSeparator())
		wavesContainer.Add(waveBox)
	}
	addWaveBtn := widget.NewButton("添加 Wave", func() {
		newWave := Wave{
			WaveId:      len(stageData.Waves),
			Progress:    0,
			Flag:        "normal",
			Monsters:    []Monster{},
			Duration:    0,
			MaxDelay:    20,
			MinDelay:    20,
			Arrangement: 1,
			MinLine:     1,
			StarShards:  0,
			ExceptLine:  []int{},
		}
		stageData.Waves = append(stageData.Waves, newWave)
		mainSplit.Trailing = getWaveContent(win)
		mainSplit.Refresh()
	})
	// 用滚动容器包装内容
	vscroll := container.NewVScroll(container.NewVBox(wavesContainer, addWaveBtn))
	return vscroll
}

// OnWin 部分：编辑两个数组（以逗号分隔的数字）
func getOnWinContent(win fyne.Window) fyne.CanvasObject {
	if stageData == nil {
		return widget.NewLabel("没有数据")
	}
	unLockEntry := widget.NewMultiLineEntry()
	unLockPlantEntry := widget.NewMultiLineEntry()
	unLockEntry.SetText(intSliceToString(stageData.OnWin.UnLock))
	unLockPlantEntry.SetText(intSliceToString(stageData.OnWin.UnLockPlant))
	form := widget.NewForm(
		widget.NewFormItem("UnLock (逗号分隔)", unLockEntry),
		widget.NewFormItem("UnLockPlant (逗号分隔)", unLockPlantEntry),
	)
	updateBtn := widget.NewButton("更新 OnWin", func() {
		stageData.OnWin.UnLock = stringToIntSlice(unLockEntry.Text)
		stageData.OnWin.UnLockPlant = stringToIntSlice(unLockPlantEntry.Text)
		dialog.ShowInformation("更新", "OnWin 更新成功", win)
	})
	return container.NewVBox(form, updateBtn)
}

// Rewards 部分：每个 ProgressReward 包含 progress 以及内嵌的 Reward (type, count)
func getRewardsContent(win fyne.Window) fyne.CanvasObject {
	if stageData == nil {
		return widget.NewLabel("没有数据")
	}
	rewardsContainer := container.NewVBox()
	for i, pr := range stageData.Rewards {
		index := i
		progressEntry := widget.NewEntry()
		progressEntry.SetText(fmt.Sprintf("%d", pr.Progress))
		rewardTypeEntry := widget.NewEntry()
		rewardTypeEntry.SetText(fmt.Sprintf("%d", pr.Reward.Type))
		rewardCountEntry := widget.NewEntry()
		rewardCountEntry.SetText(fmt.Sprintf("%d", pr.Reward.Count))
		rewardTypeLabel := widget.NewLabel("Reward Type")
		if name, ok := rewardTypeNames[pr.Reward.Type]; ok && name != "" {
			rewardTypeLabel.SetText(fmt.Sprintf("Reward Type (%s)", name))
		}
		form := widget.NewForm(
			widget.NewFormItem("Progress", progressEntry),
			widget.NewFormItem("Reward Type", rewardTypeEntry),
			widget.NewFormItem("Reward Count", rewardCountEntry),
		)
		updateRewardBtn := widget.NewButton("更新 Reward", func() {
			if p, err := strconv.Atoi(progressEntry.Text); err == nil {
				stageData.Rewards[index].Progress = p
			}
			if rt, err := strconv.Atoi(rewardTypeEntry.Text); err == nil {
				stageData.Rewards[index].Reward.Type = rt
			}
			if rc, err := strconv.Atoi(rewardCountEntry.Text); err == nil {
				stageData.Rewards[index].Reward.Count = rc
			}
			dialog.ShowInformation("更新", "Reward 更新成功", win)
		})
		rewardBox := container.NewVBox(form, updateRewardBtn, widget.NewSeparator())
		rewardsContainer.Add(rewardBox)
	}
	addRewardBtn := widget.NewButton("添加 Reward", func() {
		newReward := ProgressReward{
			Progress: 0,
			Reward: Reward{
				Type:  0,
				Count: 1,
			},
		}
		stageData.Rewards = append(stageData.Rewards, newReward)
		mainSplit.Trailing = getRewardsContent(win)
		mainSplit.Refresh()
	})
	vscroll := container.NewVScroll(container.NewVBox(rewardsContainer, addRewardBtn))
	return vscroll
}

// -------------- 工具函数 --------------

func intSliceToString(arr []int) string {
	var s []string
	for _, v := range arr {
		s = append(s, fmt.Sprintf("%d", v))
	}
	return strings.Join(s, ",")
}

func stringToIntSlice(s string) []int {
	parts := strings.Split(s, ",")
	var result []int
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		if num, err := strconv.Atoi(trimmed); err == nil {
			result = append(result, num)
		}
	}
	return result
}

// 映射配置对话框：用户每行输入 id:name
func showConfigDialog(win fyne.Window) {
	monsterMappingEntry := widget.NewMultiLineEntry()
	rewardMappingEntry := widget.NewMultiLineEntry()
	stageMappingEntry := widget.NewMultiLineEntry()

	monsterMappingEntry.SetText(mapToString(monsterNames))
	rewardMappingEntry.SetText(mapToString(rewardTypeNames))
	stageMappingEntry.SetText(mapToString(stageTypeNames))

	form := widget.NewForm(
		widget.NewFormItem("Monster 映射 (格式: id:name 每行一个)", monsterMappingEntry),
		widget.NewFormItem("RewardType 映射 (格式: id:name 每行一个)", rewardMappingEntry),
		widget.NewFormItem("StageType 映射 (格式: id:name 每行一个)", stageMappingEntry),
	)
	dialog.ShowForm("配置映射", "更新", "取消", form.Items, func(confirmed bool) {
		if confirmed {
			monsterNames = stringToMap(monsterMappingEntry.Text)
			rewardTypeNames = stringToMap(rewardMappingEntry.Text)
			stageTypeNames = stringToMap(stageMappingEntry.Text)
			dialog.ShowInformation("更新", "配置已更新", win)
		}
	}, win)
}

func mapToString(m map[int]string) string {
	var lines []string
	for k, v := range m {
		lines = append(lines, fmt.Sprintf("%d:%s", k, v))
	}
	return strings.Join(lines, "\n")
}

func stringToMap(s string) map[int]string {
	result := make(map[int]string)
	lines := strings.Split(s, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, ":", 2)
		if len(parts) != 2 {
			continue
		}
		keyStr := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])
		if key, err := strconv.Atoi(keyStr); err == nil {
			result[key] = value
		}
	}
	return result
}
