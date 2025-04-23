from PIL import Image
import os
import zipfile

# Load the image
img_path = "./未标题-1.png"
img = Image.open(img_path)

# Create output directory
output_dir = "./split_images"
os.makedirs(output_dir, exist_ok=True)

# Get dimensions and compute cell size
width, height = img.size
cell_w = width // 4
cell_h = height // 4

# Split and save cells
file_paths = []
for row in range(4):
    for col in range(4):
        left = col * cell_w
        upper = row * cell_h
        right = (col + 1) * cell_w
        lower = (row + 1) * cell_h
        cell = img.crop((left, upper, right, lower))
        cell_filename = f"cell_{row*4 + col + 1}.png"
        cell_path = os.path.join(output_dir, cell_filename)
        cell.save(cell_path)
        file_paths.append(cell_path)

# Create a zip file
zip_path = "./split_images.zip"
with zipfile.ZipFile(zip_path, "w") as zipf:
    for file in file_paths:
        zipf.write(file, arcname=os.path.basename(file))

zip_path
