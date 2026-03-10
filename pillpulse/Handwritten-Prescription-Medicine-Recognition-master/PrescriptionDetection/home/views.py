from django.shortcuts import render,HttpResponse
from django.core.files.storage import FileSystemStorage

import os,cv2,shutil
from .WordSegmentation import wordSegmentation, prepareImg, xyz
from .mlFunction import test_image_array

#imports for ml code
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

def deldir(request):
	count = 0
	FLD=['uploadedFiles','preProcess','ml','data']
	for var_file in FLD:
		folder = 'C:\\Users\\VEERBHADDRA\\Desktop\\shubi\\PrescriptionDetection\\static\\{fileNam}'.format(fileNam=var_file)
		for filename in os.listdir(folder):
			file_path = os.path.join(folder, filename)
			try:
				if os.path.isfile(file_path) or os.path.islink(file_path):
					os.unlink(file_path)
					count+=1
				elif os.path.isdir(file_path):
					shutil.rmtree(file_path)
			except Exception as e:
				print('Failed to delete %s. Reason: %s' % (file_path, e))
	print("{no_of_files} files deleted".format(no_of_files=count))
	return render(request,'DelPage.html',{'df':count})


def index(request):
	uploaded_file = 0
	if request.method == 'POST':
		uploaded_file = request.FILES['document']
		print(uploaded_file.name)
		print(uploaded_file.size)
		fs = FileSystemStorage()
		fs.save(uploaded_file.name,uploaded_file)
		print(uploaded_file)
	if(uploaded_file != 0):
		return render(request,'HomePage.html',{'ufo':uploaded_file.name})	
	return render(request,'HomePage.html')



def ans(request):

	# result=sendChecked.objects.all()
	# print(result)
	if request.method =='POST':
		some_var = request.POST.getlist('checks[]')
		print(some_var)
		preProcessFiles0 = os.listdir('C:\\Users\\VEERBHADDRA\\Desktop\\shubi\\PrescriptionDetection\\static\\preProcess')
		for i in some_var:
			file1=cv2.imread('C:\\Users\\VEERBHADDRA\\Desktop\\shubi\\PrescriptionDetection\\static\\preProcess\\%s' %i, 0)
			cv2.imwrite('C:\\Users\\VEERBHADDRA\\Desktop\\shubi\\PrescriptionDetection\\static\\ml\\%s.png' % i,file1)

		new_model = load_model('C:\\Users\\VEERBHADDRA\\Desktop\\shubi\\PrescriptionDetection\\home\\FinalModel2.h5')
		probability_model = tf.keras.Sequential([new_model, tf.keras.layers.Softmax()])
		test_images = test_image_array('C:\\Users\\VEERBHADDRA\\Desktop\\shubi\\PrescriptionDetection\\static\\ml')
		predictions = probability_model.predict(test_images)
		categories = ['hairbless','lobate']
		op_list = []
		for i in range(0,len(predictions)):
			# predictions[i]
			op_list.append(categories[(int(np.argmax(predictions[i])))])

		MLFILES = os.listdir('C:\\Users\\VEERBHADDRA\\Desktop\\shubi\\PrescriptionDetection\\static\\ml')
		

	else:
		print('ERROR in URL')


	return render(request,'outputAns.html',{'a':MLFILES,'b':op_list})



def Snip(request):

	preProcessFiles = os.listdir('C:\\Users\\VEERBHADDRA\\Desktop\\shubi\\PrescriptionDetection\\static\\uploadedFiles')
	for (i, f) in enumerate(preProcessFiles):
		preProcess = cv2.imread('C:\\Users\\VEERBHADDRA\\Desktop\\shubi\\PrescriptionDetection\\static\\uploadedFiles\\%s' % f, 0)
		ColorPreprocess = cv2.imread('C:\\Users\\VEERBHADDRA\\Desktop\\shubi\\PrescriptionDetection\\static\\uploadedFiles\\%s' % f)
		preProcess = cv2.medianBlur(preProcess, 5)
		Gaussian = cv2.adaptiveThreshold(preProcess, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
		cv2.imwrite('C:\\Users\\VEERBHADDRA\\Desktop\\shubi\\PrescriptionDetection\\static\\data\\%d.png' % i, Gaussian)
		cv2.imwrite('C:\\Users\\VEERBHADDRA\\Desktop\\shubi\\PrescriptionDetection\\static\\dataRGB\\%d.png' % i, ColorPreprocess)

	imgFiles = os.listdir('C:\\Users\\VEERBHADDRA\\Desktop\\shubi\\PrescriptionDetection\\static\\data')
	for (i, f) in enumerate(imgFiles):
		print('Segmenting words of sample %s' % f)

    # read image, prepare it by resizing it to fixed height and converting it to grayscale
		img = prepareImg(cv2.imread('C:\\Users\\VEERBHADDRA\\Desktop\\shubi\\PrescriptionDetection\\static\\data\\%s' % f), 1000) 
		imgRGB = xyz(cv2.imread('C:\\Users\\VEERBHADDRA\\Desktop\\shubi\\PrescriptionDetection\\static\\dataRGB\\%s' % f), 1000) 

    # execute segmentation with given parameters
    # -kernelSize: size of filter kernel (odd integer)
    # -sigma: standard deviation of Gaussian function used for filter kernel
    # -theta: approximated width/height ratio of words, filter function is distorted by this factor
    # - minArea: ignore word candidates smaller than specified area
	res = wordSegmentation(imgRGB, img, kernelSize=25, sigma=11, theta=7, minArea=100)

    # write output to 'out/inputFileName' directory
	# if not os.path.exists('../static/out/%s' % f):
	# 	os.mkdir('../static/out/%s' % f)

    # iterate over all segmented words
	print('Segmented into %d words' % len(res))
	for (j, w) in enumerate(res):
		(wordBox, wordImg) = w
		(x, y, w, h) = wordBox
		cv2.imwrite('C:\\Users\\VEERBHADDRA\\Desktop\\shubi\\PrescriptionDetection\\static\\preProcess\\%d.png' % j, wordImg)  # save word
		cv2.rectangle(imgRGB, (x, y), (x + w, y + h), 0, 1)  # draw bounding box in summary image

    # output summary image with bounding boxes around words
	# cv2.imwrite('../out/%s/summary.png' % f, img)


	pathz ="C:\\Users\\VEERBHADDRA\\Desktop\\shubi\\PrescriptionDetection\\static\\preProcess"
	ListFiles = []

	for r, d, f in os.walk(pathz):
		for file in f:
			ListFiles.append(file)
	print(ListFiles)
	l = len(ListFiles)


	# for i in range(len(ListFiles)):
	# sample1 = SnipOP()
	return render(request,'SnippetSelect.html',{'WordSegments':ListFiles})


