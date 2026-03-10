# Handwritten-Prescription-Medicine-Recognition   [![GitHub license](https://img.shields.io/github/license/ShubhamRaorane/Handwritten-Prescription-Medicine-Recognition)](https://github.com/ShubhamRaorane/Handwritten-Prescription-Medicine-Recognition/blob/master/LICENSE)
Recoginzing handwritten names of medicines prescribed by doctor's.


## Description
The handwriting of doctors on prescriptions is often unintelligible.This causes people to make mistakes while reading the names of medicines and take the wrong medicines.The goal of this project was to create a prototype that can classify the snippet of the the unintelligble handwritten medicine name passed on to it from a prescription.The model which has been trained on images of handwritten snips of medicines from the doctor will classify the inputs snips of medicine images into the correct medicine name string.


## Scope of the project

This is a beginner level project intended to give a practical insight into machine learning. The project was completed within a month so It isn't a proper application.It's just a working prototype that does one task well - classification.However the the model is able to successfully predict the medicine snip in an actual doctor's handwriting with high accuracy.As data of doctors handwriting wasn't freely available and it wasn't feasible to ask doctor's for such data for such a samll project.So we decided to make our own dataset.
The approach we adopted was as follows:-
<br><br>
<b>1. First we sought out prescriptions from our own homes that we had that had mildly unintelligible handwritng.
<br>
2. Then we chose two medicine names --> Hairbless & Lobate, which were on the presciption we had.
<br>
3. Then we manually wrote down the two medicine names in a style similar to the doctors handwriting.
<br>
4. Pre-processed the images and trained a model on this data.
<br>
5. Made the model predict for the actual snips of the doctors handwritng(these snips weren't used for training the model or validation).</b>
<br><br>
## Prototype Demo
<div align="center">
  
<b>1.Upload Image of prescription.</b><br>
![MainPage](https://github.com/ShubhamRaorane/Handwritten-Prescription-Medicine-Recognition/blob/master/demo_images/4765872e-ddbf-4ef2-92b6-c61ec3c78135.png?raw=true?align=centre "Main page")<br>
<b>2.Image of prescription to be uploaded(actual doctors prescription)</b><br>
![Prescription](https://github.com/ShubhamRaorane/Handwritten-Prescription-Medicine-Recognition/blob/master/demo_images/ca8c4cd4-7e82-4043-a1e5-ce3573eb7fc0.png?raw=true "Prescription")<br>
<b>3.Select the snip of the medicine to send to the model for prediciton</b><br>
![SelectImage](https://github.com/ShubhamRaorane/Handwritten-Prescription-Medicine-Recognition/blob/master/demo_images/7ec653ff-9656-4c30-84d4-bcb25a58111e.png?raw=true "SelectImage")<br>
<b>4.Output of image predicted</b><br>
![Output Prediction](https://github.com/ShubhamRaorane/Handwritten-Prescription-Medicine-Recognition/blob/master/demo_images/764e4b7b-a123-4c81-b7b0-b75066821dc1.png?raw=true "Output Prediction")<br>
<b>5.Word Segmentation</b><br>
![Word Segmentation](https://github.com/ShubhamRaorane/Handwritten-Prescription-Medicine-Recognition/blob/master/demo_images/9080a745-562e-49b0-8625-602e1b8aa42d.png?raw=true "Word Segmentation")<br>

</div>

## Requirements
<ul>
  <li>Python 3.7.x</li>
  <li>Django</li>
  <li>Tensorflow 2.x </li>
  <li>OpenCV 4.2.0</li>
  <li>numpy 1.18.1</li>
 </ul>
 <p>A list of libraries in the conda environment is provided in <i>environmentPackages.txt</i></p>
 <br>
   
 ## Project Members
 
 <b>Shubham Raorane  [https://github.com/ShubhamRaorane] </b>
 <br>
 <b>Amrut Savadatti  [https://github.com/amrutsavadatti] </b>
 <br>
 <b>Ryan Jacobs</b>
 
 ## References & Resources
 
 <ul>
  <li>Tensorflow Classification notebook (https://www.tensorflow.org/tutorials/keras/classification)</li>
  <li>Scale space technique for word segmentation proposed by R. Manmatha (http://ciir.cs.umass.edu/pubfiles/mm-27.pdf)</li>
  <li>Deep Lizard tutorials (https://deeplizard.com/learn/video/YRhxdVk_sIs) & (https://www.youtube.com/playlist?list=PLZbbT5o_s2xrwRnXk_yCPtnqqo4_u2YGL)</li>
 </ul>
