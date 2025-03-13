import argparse
from PIL import Image, ImageDraw

def get_grid_top_left(col, row, grid_rows):
    # 如果 grid_rows 大于6，则报错
    if grid_rows > 6:
        raise ValueError("row_number should be less than or equal to 6")
    # 计算 gridOffsetY
    if grid_rows == 6:
        grid_offset_y = 20
    else:  # grid_rows <= 5
        grid_offset_y = 100 + (5 - grid_rows) * (90 * 2/3)  # 90*2/3 等于60
    x = col * 80 + 50
    y = int(row * 90 + grid_offset_y)
    return x, y

def main(grid_rows, grid_cols):
    # 创建一张 800×600 的白色背景图片
    width, height = 800, 600
    image = Image.new("RGBA", (width, height), (255,255,255,0))
    draw = ImageDraw.Draw(image)
    
    # 固定边框颜色为绿色，边框宽度为1像素
    rect_color = "green"
    
    # 绘制网格中的矩形边框
    for row in range(grid_rows):
        for col in range(grid_cols):
            x, y = get_grid_top_left(col, row, grid_rows)
            # 矩形尺寸固定为 80×90
            rect_bbox = [x, y, x + 80, y + 90]
            draw.rectangle(rect_bbox, outline=rect_color, width=1)
    
    # 保存生成的图片
    name = f"grid_{grid_rows}x{grid_cols}.png"
    image.save(name)
    print(name, "已保存")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="生成固定尺寸图片和矩形网格")
    parser.add_argument("-r", type=int, default=6, help="网格行数（最大6）")
    parser.add_argument("-c", type=int, default=9, help="网格列数, 固定而且只能为9")
    args = parser.parse_args()
    
    main(args.r, args.c)
