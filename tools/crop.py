from PIL import Image
import zipfile
import os

# Load the image
img_path = './alltexture.png'
img = Image.open(img_path)

# Get the dimensions of the image
img_width, img_height = img.size

# Define the size of each item
item_size = 256

# Create a directory to save the individual items
output_dir = './sprites'
os.makedirs(output_dir, exist_ok=True)

# Calculate the number of items in the image
num_cols = img_width // item_size
num_rows = img_height // item_size

# Extract and save each item as an individual image
item_paths = []
for row in range(num_rows):
    for col in range(num_cols):
        # Define the bounding box for each item
        left = col * item_size
        upper = row * item_size
        right = left + item_size
        lower = upper + item_size
        
        # Crop the image to get the item
        item = img.crop((left, upper, right, lower))
        
        # Save the cropped item
        item_name = f"item_{row}_{col}.png"
        item_path = os.path.join(output_dir, item_name)
        item.save(item_path)

