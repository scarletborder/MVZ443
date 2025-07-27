#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys


def count_lines_in_file(path):
    """
    统计单个文件的行数，忽略编码错误。
    """
    count = 0
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        for _ in f:
            count += 1
    return count


def walk_and_count(root_dir):
    """
    递归遍历 root_dir 下的所有文件，统计行数。
    返回列表 [(文件路径, 行数), ...] 以及总行数。
    """
    total = 0
    details = []
    for dirpath, dirnames, filenames in os.walk(root_dir):
        for fname in filenames:
            fullpath = os.path.join(dirpath, fname)
            try:
                lines = count_lines_in_file(fullpath)
            except Exception as e:
                # 如果某个文件无法读取，在 stderr 中报告并跳过
                print(f"Warning: 无法读取文件 {fullpath}: {e}", file=sys.stderr)
                continue
            details.append((fullpath, lines))
            total += lines
    return details, total


def main():
    # 如果用户在命令行提供了目录，则使用之，否则默认为当前目录
    target_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    if not os.path.isdir(target_dir):
        print(f"Error: 路径 '{target_dir}' 不是一个目录。", file=sys.stderr)
        sys.exit(1)

    file_stats, total_lines = walk_and_count(target_dir)

    # 输出每个文件的行数
    for filepath, lines in file_stats:
        print(f"{filepath}: {lines} 行")

    # 输出总行数
    print(f"\n总计: {total_lines} 行")


if __name__ == "__main__":
    main()
