from PIL import Image
import os

# -- 配置区域 --
# 1. 把下面的路径改成你的 16x16 小图所在文件夹
image_dir = "."
# 2. 输出文件名（会保存在当前工作目录）
output_file = "spritesheet_256x16.png"
# ----------------

# 获取所有 PNG 文件，并按名称排序
files = sorted([f for f in os.listdir(image_dir) if f.lower().endswith(".png")])

# 计算 spritesheet 尺寸：宽度 = 图像数量 × 16，高度 = 16
count = len(files)
sheet = Image.new("RGBA", (16 * count, 16))

# 依次粘贴
for idx, filename in enumerate(files):
    img = Image.open(os.path.join(image_dir, filename))
    # 确保每张图都是 16×16
    if img.size != (16, 16):
        img = img.resize((16, 16), Image.Resampling.LANCZOS)
    sheet.paste(img, (idx * 16, 0))

# 保存
sheet.save(output_file)
print(f"Sprite sheet saved as: {output_file}")
