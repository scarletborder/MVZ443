//go:build js && wasm

package main

import "syscall/js"

// 创建一个表来存储字符的偏移量
func createBadCharTable(pattern string) map[rune]int {
	table := make(map[rune]int)
	m := len(pattern)
	for i := 0; i < m-1; i++ {
		table[rune(pattern[i])] = m - 1 - i
	}
	return table
}

// Boyer-Moore 搜索算法
func boyerMooreSearch(text, pattern string) bool {
	m := len(pattern)
	n := len(text)

	// 如果模式字符串长度大于文本字符串长度，直接返回 false
	if m > n {
		return false
	}

	// 创建坏字符表
	badCharTable := createBadCharTable(pattern)

	// 从文本字符串的末尾开始
	i := m - 1
	for i < n {
		j := m - 1
		for j >= 0 && text[i] == pattern[j] {
			i--
			j--
		}

		// 如果找到匹配
		if j == -1 {
			return true
		}

		// 否则，根据坏字符规则跳转
		badCharShift, exists := badCharTable[rune(text[i])]
		if !exists {
			i += m
		} else {
			i += badCharShift
		}
	}

	return false
}

// Go 导出到 JS 函数
func main() {
	c := make(chan struct{}, 0)

	// 将 Boyer-Moore 算法包装为 JS 可以调用的函数
	js.Global().Set("boyerMooreSearch", js.FuncOf(func(this js.Value, p []js.Value) interface{} {
		text := p[0].String()
		pattern := p[1].String()
		result := boyerMooreSearch(text, pattern)
		return js.ValueOf(result)
	}))

	<-c
}
