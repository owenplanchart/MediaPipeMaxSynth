# MediaPipeMaxSynth# jweb-hands-landmarker
Colour Palette comes from here: https://color.adobe.com/explore
/* Color Theme Swatches in Hex */
.Green-on-Green---Porsche-991-Speedster-1-hex { color: #025E73; }
.Green-on-Green---Porsche-991-Speedster-2-hex { color: #011F26; }
.Green-on-Green---Porsche-991-Speedster-3-hex { color: #A5A692; }
.Green-on-Green---Porsche-991-Speedster-4-hex { color: #BFB78F; }
.Green-on-Green---Porsche-991-Speedster-5-hex { color: #F2A71B; }


This Patch plays well with the patch MyKarpluStrungMediaPipe in MediaPipeExperiments folder


A self contained example demonstrating how to use MediaPipe HandLandmarker with Max's `jweb` connected to either a live webcamera stream or using still images.

![Max example patcher](jweb-hands-landmarker.gif)

## Features

The hand landmark model bundle detects the keypoint localization of 21 hand-knuckle coordinates within the detected hand regions. The model was trained on approximately 30K real-world images, as well as several rendered synthetic hand models imposed over various backgrounds.

![Handlandmarks diagram](hand-landmarks.png)

## Resources

This example is inspired by [an example by Rob Ramirez](https://github.com/robtherich/jweb-mediapipe), which is in turn inspired by [MediaPipe in JavaScript](https://github.com/LintangWisesa/MediaPipe-in-JavaScript). 

