import os
import tensorflow as tf
import numpy as np
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Conv2D, Flatten, Dropout, MaxPooling2D
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow import keras
from tensorflow.keras.models  import load_model
import cv2
import random

img_height = 80
img_width = 160
def test_image_array(directory):
    """takes directory of test images,reads them and converts them into numpy arrays."""
    image_list = os.listdir(directory)
    test_array = []
    for image in image_list:
        image_array = cv2.imread(os.path.join(directory,image),cv2.IMREAD_GRAYSCALE)
        new_array = cv2.resize(image_array,(160,80))
        new_array = new_array.reshape(new_array.shape + (1,))
        test_array.append(new_array)
    test_array = np.array(test_array)
    test_array = test_array/255.0
    return test_array