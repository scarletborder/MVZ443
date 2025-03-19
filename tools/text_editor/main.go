package main

import (
	"fmt"
	"io/ioutil"
	"os"
	"sort"
	"strings"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/dialog"
	"fyne.io/fyne/v2/storage"
	"fyne.io/fyne/v2/widget"
)

// 全局变量：保存当前数据、当前选中 key、文件路径以及每个 key 的定界符
var (
	locales     = make(map[string]string)
	delims      = make(map[string]string) // 保存每个 key 的字符串定界符，如 "`", "\"" 或 "'"
	keys        []string
	currentKey  string
	currentFile string
	autoWrap    = true
)

// extractStringContent 检测 s 是否以相同的定界符包裹，如果是则返回内部内容和该定界符，否则返回原始 s 和空字符串
func extractStringContent(s string) (string, string) {
	s = strings.TrimSpace(s)
	if len(s) >= 2 {
		if (s[0] == '`' && s[len(s)-1] == '`') ||
			(s[0] == '"' && s[len(s)-1] == '"') ||
			(s[0] == '\'' && s[len(s)-1] == '\'') {
			return s[1 : len(s)-1], string(s[0])
		}
	}
	return s, ""
}

// wrapStringContent 根据定界符将 content 包装起来，如果 delim 为空则默认使用反引号
func wrapStringContent(content, delim string) string {
	if delim == "" {
		delim = "`"
	}
	return delim + content + delim
}

func main() {
	a := app.New()
	w := a.NewWindow("Locale Editor")

	// 左侧列表展示所有 key
	list := widget.NewList(
		func() int { return len(keys) },
		func() fyne.CanvasObject { return widget.NewLabel("template") },
		func(i widget.ListItemID, o fyne.CanvasObject) {
			o.(*widget.Label).SetText(keys[i])
		},
	)

	// 右侧多行文本框编辑对应字符串
	entry := widget.NewMultiLineEntry()
	entry.SetPlaceHolder("编辑内容…")
	// 设置自动换行（初始为开启状态）
	entry.Wrapping = fyne.TextWrapWord

	// 列表选中时加载对应的 value 到编辑框
	list.OnSelected = func(id widget.ListItemID) {
		if id >= 0 && id < len(keys) {
			// 保存当前编辑内容（重新包装上定界符）
			if currentKey != "" {
				locales[currentKey] = wrapStringContent(entry.Text, delims[currentKey])
			}
			currentKey = keys[id]
			// 提取内部内容显示给用户
			inner, _ := extractStringContent(locales[currentKey])
			entry.SetText(inner)
		}
	}

	// 保存按钮：保存当前数据到文件中
	saveButton := widget.NewButton("保存", func() {
		if currentKey != "" {
			locales[currentKey] = wrapStringContent(entry.Text, delims[currentKey])
		}
		if currentFile == "" {
			dialog.ShowInformation("提示", "请先导入文件", w)
			return
		}
		if err := saveLocaleFile(currentFile, locales); err != nil {
			dialog.ShowError(err, w)
		} else {
			dialog.ShowInformation("成功", "文件已保存", w)
		}
	})

	// “导入”菜单项：选择文件并加载
	importItem := fyne.NewMenuItem("导入", func() {
		openFileDialog := dialog.NewFileOpen(func(read fyne.URIReadCloser, err error) {
			if err != nil {
				dialog.ShowError(err, w)
				return
			}
			if read == nil {
				return
			}
			defer read.Close()
			currentFile = read.URI().Path()
			loadedLocales, loadedDelims, err := parseLocaleFile(currentFile)
			if err != nil {
				dialog.ShowError(err, w)
				return
			}
			locales = loadedLocales
			delims = loadedDelims
			keys = getSortedKeys(locales)
			list.Refresh()
		}, w)
		openFileDialog.SetFilter(storage.NewExtensionFileFilter([]string{".js"}))

		// 设置初始目录为当前工作目录
		if cwd, err := os.Getwd(); err == nil {
			if lister, err := storage.ListerForURI(storage.NewFileURI(cwd)); err == nil {
				openFileDialog.SetLocation(lister)
			}
		}
		openFileDialog.Show()
	})

	// “增加”菜单项：增加新的 key-string 对，默认使用反引号
	addItem := fyne.NewMenuItem("增加", func() {
		keyEntry := widget.NewEntry()
		keyEntry.SetPlaceHolder("新Key")
		valueEntry := widget.NewMultiLineEntry()
		valueEntry.SetPlaceHolder("新Value")
		form := widget.NewForm(
			widget.NewFormItem("Key", keyEntry),
			widget.NewFormItem("Value", valueEntry),
		)
		dialog.ShowForm("增加新的 Key-Value", "添加", "取消", form.Items, func(confirmed bool) {
			if confirmed {
				newKey := strings.TrimSpace(keyEntry.Text)
				if newKey == "" {
					dialog.ShowError(fmt.Errorf("Key 不能为空"), w)
					return
				}
				if _, exists := locales[newKey]; exists {
					dialog.ShowError(fmt.Errorf("Key 已存在"), w)
					return
				}
				// 默认使用反引号
				locales[newKey] = wrapStringContent(valueEntry.Text, "`")
				delims[newKey] = "`"
				keys = append(keys, newKey)
				sort.Strings(keys)
				list.Refresh()
			}
		}, w)
	})

	// “切换文件显示框自动换行”菜单项，用于在自动换行和不换行之间切换
	wrapItem := fyne.NewMenuItem("切换文件显示框自动换行", func() {
		autoWrap = !autoWrap
		if autoWrap {
			entry.Wrapping = fyne.TextWrapWord
		} else {
			entry.Wrapping = fyne.TextWrapOff
		}
		entry.Refresh()
	})

	// 设置上方菜单：文件菜单包含“导入”和“增加”，视图菜单包含“切换自动换行”
	mainMenu := fyne.NewMainMenu(
		fyne.NewMenu("文件", importItem, addItem),
		fyne.NewMenu("视图", wrapItem),
	)
	w.SetMainMenu(mainMenu)

	// 布局：左侧列表，右侧编辑框，底部保存按钮
	right := container.NewBorder(nil, saveButton, nil, nil, entry)
	content := container.NewHSplit(list, right)
	content.SetOffset(0.3)
	w.SetContent(content)
	w.Resize(fyne.NewSize(800, 600))
	w.ShowAndRun()
}

// getSortedKeys 返回 map 中的 key，并排序
func getSortedKeys(m map[string]string) []string {
	var keys []string
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

// parseLocaleFile 使用状态机方式解析 js 文件中 export default 对象的 key-value 对
func parseLocaleFile(filename string) (map[string]string, map[string]string, error) {
	data, err := ioutil.ReadFile(filename)
	if err != nil {
		return nil, nil, err
	}
	content := strings.TrimSpace(string(data))
	// 提取大括号内的内容
	start := strings.Index(content, "{")
	end := strings.LastIndex(content, "}")
	if start < 0 || end < 0 || start > end {
		return nil, nil, fmt.Errorf("文件格式错误")
	}
	content = content[start+1 : end]

	result := make(map[string]string)
	delimMap := make(map[string]string)

	i := 0
	n := len(content)
	for i < n {
		// 跳过空格、换行及逗号
		for i < n && (content[i] == ' ' || content[i] == '\n' || content[i] == '\t' || content[i] == ',') {
			i++
		}
		if i >= n {
			break
		}
		// 读取 key，直到遇到冒号
		keyStart := i
		for i < n && content[i] != ':' {
			i++
		}
		if i >= n {
			break
		}
		key := strings.TrimSpace(content[keyStart:i])
		key = strings.ReplaceAll(key, ",", "")
		key = strings.TrimSpace(key)
		i++ // 跳过冒号

		// 跳过冒号后空白字符
		for i < n && (content[i] == ' ' || content[i] == '\n' || content[i] == '\t') {
			i++
		}
		if i >= n {
			break
		}
		// 期望下一个字符是定界符
		delim := string(content[i])
		if delim != "`" && delim != "\"" && delim != "'" {
			return nil, nil, fmt.Errorf("未知的字符串定界符: %v", delim)
		}
		i++ // 跳过开始定界符
		// 从这里开始读取 value，直到遇到相同定界符
		valueStart := i
		for i < n && string(content[i]) != delim {
			i++
		}
		if i >= n {
			return nil, nil, fmt.Errorf("Key: %s 缺少结束定界符", key)
		}
		value := content[valueStart:i]
		i++ // 跳过结束定界符

		// 保存解析结果（保持定界符以便后续保存时使用原格式）
		result[key] = delim + value + delim
		delimMap[key] = delim

		// 跳过结束定界符后可能的逗号及空白字符
		for i < n && (content[i] == ' ' || content[i] == '\n' || content[i] == '\t' || content[i] == ',') {
			i++
		}
	}
	return result, delimMap, nil
}

// saveLocaleFile 将 map 数据按照原格式写回文件
func saveLocaleFile(filename string, data map[string]string) error {
	var sb strings.Builder
	sb.WriteString("export default {\n")
	for key, value := range data {
		sb.WriteString("    " + key + ": ")
		lines := strings.Split(value, "\n")
		if len(lines) > 0 {
			lines[0] = strings.ReplaceAll(lines[0], ">", ":")
			sb.WriteString(lines[0] + "\n")
			for _, line := range lines[1:] {
				line = strings.ReplaceAll(line, ">", ":")
				sb.WriteString(line + "\n")
			}
		}
		sb.WriteString(",\n")
	}
	sb.WriteString("}\n")
	return ioutil.WriteFile(filename, []byte(sb.String()), 0644)
}
