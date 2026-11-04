---
title: '别急着清理硬盘：用 Python 找出真正重复的文件'
description: '用文件大小、SHA-256 和逐块比较筛选重复文件，生成可检查的 CSV 清单。'
pubDate: 'Nov 04 2026'
heroImage: '../../assets/cover.jpg'
category: '方法笔记'
tags: ['计算机应用', 'Python', '文件管理']
---

## 一、要解决什么问题

下载目录里经常会出现这样的文件：

```text
课程资料.pdf
课程资料(1).pdf
课程资料-最终版.pdf
```

它们可能完全相同，也可能只是名字相似。

只按文件名清理，会漏掉改过名字的副本；只按文件大小判断，又可能把两个不同文件当成同一个。

这篇文章做一个小工具：扫描指定文件夹，找出内容完全一致的文件，把结果写进 CSV 表格。

边界先说明白：

- 不移动文件。
- 不删除文件。
- 不修改文件名。
- 不判断哪个版本“更好”。
- 只比较文件内容，不比较权限、创建时间等元数据。

先拿到可信的清单，再决定怎么处理。

## 二、为什么分三步比较

如果对每个文件都直接进行完整内容比较，文件一多，就会产生大量重复读取。

更合适的顺序是：

```text
按大小分组 → 按 SHA-256 分组 → 逐块比较内容
```

### 第一步：按大小分组

内容完全相同的文件，字节数一定相同。

如果一个文件的大小在整个扫描范围内只出现一次，就不必继续读取它的内容。

注意，这个关系不能反过来用：大小相同，不代表内容相同。

### 第二步：计算 SHA-256

对大小相同的候选文件，计算 SHA-256 摘要。

可以把摘要理解为根据文件内容计算出的一个固定长度结果。文件名不会参与计算，所以改名后的副本也能被筛出来。

代码分块读取文件，而不是一次把整个文件装进内存。读取大文件时，这样更稳妥。

### 第三步：逐块比较

摘要用于缩小范围，不作为最后一步。

对大小和摘要都相同的候选文件，再逐块比较实际字节。最终写进清单的，是通过内容比较的文件。

这里没有用“摘要相同，所以绝对相同”来省略验证。

## 三、完整代码

需要本机已经安装 Python 3，不需要安装第三方库。

将下面代码保存为 `find_duplicates.py`：

```python
import argparse
import csv
import hashlib
import os
from collections import defaultdict
from pathlib import Path

BLOCK_SIZE = 1024 * 1024


def sha256_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as file:
        while True:
            block = file.read(BLOCK_SIZE)
            if not block:
                break
            digest.update(block)
    return digest.hexdigest()


def same_content(left, right):
    with left.open("rb") as a, right.open("rb") as b:
        while True:
            block_a = a.read(BLOCK_SIZE)
            block_b = b.read(BLOCK_SIZE)
            if block_a != block_b:
                return False
            if not block_a:
                return True


def report_error(error):
    print(f"[跳过] {error}")


def scan_files(root):
    for folder, directories, filenames in os.walk(
        root, followlinks=False, onerror=report_error
    ):
        directories[:] = sorted(
            name for name in directories
            if not (Path(folder) / name).is_symlink()
        )
        for name in sorted(filenames):
            path = Path(folder) / name
            try:
                if path.is_symlink() or not path.is_file():
                    continue
                yield path.stat().st_size, path
            except OSError as error:
                report_error(error)


def find_groups(root):
    by_size = defaultdict(list)
    for size, path in scan_files(root):
        by_size[size].append(path)

    for size, paths in sorted(by_size.items()):
        if len(paths) < 2:
            continue

        by_hash = defaultdict(list)
        for path in paths:
            try:
                by_hash[sha256_file(path)].append(path)
            except OSError as error:
                report_error(error)

        for digest, candidates in by_hash.items():
            if len(candidates) < 2:
                continue

            verified = []
            for path in candidates:
                try:
                    for group in verified:
                        if same_content(path, group):
                            group.append(path)
                            break
                    else:
                        verified.append([path])
                except OSError as error:
                    report_error(error)

            for group in verified:
                if len(group) > 1:
                    yield size, digest, group


def main():
    parser = argparse.ArgumentParser(
        description="扫描内容重复的文件，只输出清单，不删除文件。"
    )
    parser.add_argument("folder", help="要扫描的文件夹")
    parser.add_argument(
        "--output", default="duplicates.csv", help="输出 CSV 路径"
    )
    args = parser.parse_args()

    root = Path(args.folder).expanduser().resolve()
    output = Path(args.output).expanduser().resolve()

    if not root.is_dir():
        parser.error("扫描路径不是有效文件夹。")

    if output == root or root in output.parents:
        parser.error("请把 CSV 保存到扫描文件夹之外。")

    if not output.parent.is_dir():
        parser.error("CSV 的保存文件夹不存在。")

    if output.exists():
        parser.error("输出文件已存在，请更换文件名。")

    groups = list(find_groups(root))
    extra_bytes = sum(
        size * (len(paths) - 1) for size, _, paths in groups
    )

    with output.open("x", newline="", encoding="utf-8-sig") as file:
        writer = csv.writer(file)
        writer.writerow([
            "group_id", "size_bytes", "sha256", "path"
        ])
        for number, (size, digest, paths) in enumerate(groups, 1):
            for path in paths:
                writer.writerow([number, size, digest, str(path)])

    print(f"重复组数：{len(groups)}")
    print(f"多余副本的逻辑大小：{extra_bytes / 1024 ** 2:.2f} MiB")
    print(f"清单位置：{output}")


if __name__ == "__main__":
    main()
```

## 四、怎么运行

建议先新建一个测试文件夹，不要第一次就扫描整个硬盘。

放入以下文件：

```text
duplicate-test/
├── a.txt
├── a-copy.txt
└── different.txt
```

其中：

- `a.txt` 写入 `hello`。
- 复制 `a.txt`，得到 `a-copy.txt`。
- `different.txt` 写入 `world`。

前两个文件内容相同；第三个文件即使大小相同，也不应该被归入同一组。

在终端运行：

```bash
python find_duplicates.py "./duplicate-test" --output "./test-report.csv"
```

部分 macOS 或 Linux 环境需要把命令中的 `python` 换成 `python3`。

Windows 示例：

```powershell
py find_duplicates.py "D:\资料\待整理" --output "D:\重复文件清单.csv"
```

路径里有空格时，要保留双引号。

输出清单不能放在被扫描的文件夹里，这是代码主动加的限制，避免后续扫描把历史报告也算进资料。

再次运行时，需要换一个输出文件名，或者自行处理旧报告；脚本不会覆盖已有文件。

## 五、如何读懂清单

CSV 中每一行对应一个文件：

| 字段 | 含义 |
| --- | --- |
| group_id | 重复组编号，同组文件通过了内容比较 |
| size_bytes | 单个文件的字节数 |
| sha256 | 文件内容的 SHA-256 摘要 |
| path | 文件的完整路径 |

同一组中的第一条记录，只是扫描时先遇到的文件，不代表它是原件，也不代表应该优先保留。

处理时应先看路径：

- 一份在下载目录，一份在正式课程目录，通常优先检查下载目录中的副本。
- 一份在项目目录，一份在备份目录，可能是有意保留。
- 不同项目各自带有相同配置文件，不代表可以随意删掉其中一份。

内容重复是技术判断；某个位置是否需要这份文件，是使用场景判断。脚本只能完成前者。

## 六、这些限制不能忽略

### 1. 扫描时不要同时修改文件

这不是文件系统快照。

如果扫描期间文件被编辑、替换或同步，前后读取到的内容可能不一致。应先暂停相关编辑和同步任务，再运行工具。

因此，这个版本适合整理相对静止的个人资料，不适合直接作为生产系统的去重程序。

### 2. “多余副本大小”不等于实际可释放空间

程序按下面的方式计算：

```text
每组文件大小 ×（该组数量 - 1）
```

它统计的是逻辑字节数，不是磁盘实际占用。

硬链接、文件系统压缩等情况都可能让两者不同。不要把终端里的数字当成一定能释放的空间。

### 3. 符号链接会被跳过

工具不跟随符号链接，也不扫描链接文件本身。

这能减少意外扫到目标目录之外的情况，但不代表它识别了所有特殊文件系统结构。

### 4. 扫描失败不等于没有重复

没有权限、文件被占用或读取失败时，程序会显示“跳过”。

所以，“重复组数为 0”只能表示本次成功读取的范围内没有找到重复项，不能证明整个目录绝对没有重复文件。

### 5. 不适合用来清理系统目录

不要据此批量删除 Windows、Program Files 或应用程序内部的同名、同内容文件。

不同位置的文件可能分别被程序依赖。工具不会分析这些依赖关系。

## 七、为什么没有加自动删除

删除命令不难写，难的是确定删哪份。

一个可靠的整理流程应该是：

```text
扫描 → 检查清单 → 确认用途 → 备份 → 少量处理 → 检查结果
```

第一次使用时，可以只处理下载目录里的几个明确副本，不必追求一次清空所有重复项。

这个工具的价值不是替你做不可逆的决定，而是把“好像有很多重复文件”，变成一份可以逐项核对的清单。
