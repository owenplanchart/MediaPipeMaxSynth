// IIFE for top level await
(async () => { 
const vision = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/vision_bundle.js"); 
const { HandLandmarker, FilesetResolver, DrawingUtils } = vision;

const video = document.getElementById('videoel');
const image = document.getElementById('imageel');
const overlay = document.getElementById('overlay');
const canvas = overlay.getContext('2d');

let handLandmarker;
let camera;

let drawImage = true;
let drawHands = true;
let flipHands = true;
let runningMode = "VIDEO";

function outputMax(mess) {
  window.max.outlet(mess);
}

function outputMaxDict(dstr) {
  window.max.outlet("dictionary", dstr);
}

function setMaxDict(d) {
  window.max.setDict('hands_landmarkdict', d);
}

window.max.bindInlet('draw_image', async function (enable) {
  drawImage = enable;
  if(runningMode === "IMAGE") {
    await detectImage();
  }
});

window.max.bindInlet('draw_hands', async function (enable) {
  drawHands = enable;
  if(runningMode === "IMAGE") {
    await detectImage();
  }
});

window.max.bindInlet('set_image', async function (imageFile) {
  await setRunningMode("IMAGE");
  image.src = imageFile;
});

window.max.bindInlet('flip_image', async function (flip) {
  const factor = flip ? "1" : "-1";
  overlay.style.transform = "scaleX(" + factor + ")";
});

window.max.bindInlet('flip_hands', function (flip) {
  flipHands = flip;
});

window.max.bindInlet('set_mediadevice', async function (deviceLabel) {
  let devices = await getMediaDeviceByLabel(deviceLabel);
  if (!devices.length) {
    window.max.outlet("error", `No video input device: "${deviceLabel}" exists.`);
    return
  }
  const device = devices.shift();
  video.srcObject = await navigator.mediaDevices.getUserMedia({video: {deviceId: device.deviceId}});
  await setRunningMode("VIDEO");
});

window.max.bindInlet('get_mediadevices', function () {
  getVideoDevicesForMax();
});

const getMediaDevices = async () => {   
  if (!navigator.mediaDevices?.enumerateDevices) {
    window.max.outlet("error", "Cannot list available media devices.");
    return []
  }
  return await navigator.mediaDevices.enumerateDevices();
}

const getMediaDeviceByLabel = async (deviceLabel) => {
  let mediaDevices = await getMediaDevices();
  return mediaDevices.filter(device => device.label == deviceLabel);
}

const getVideoDevicesForMax = () => {
  getMediaDevices()
  .then((devices) => {
    let mediadevices = [];
    devices.forEach((device) => {
      if (device.kind === "videoinput") {
        mediadevices.push(device.label);
      }
    });
    window.max.outlet.apply(window.max, ["mediadevices"].concat(mediadevices));
  })
  .catch((err) => {
    window.max.outlet("error",`${err.name}: ${err.message}`);
  });
}


const startVideo = () => {
  camera = new Camera(video, {
    onFrame: async () => {
      if (video && runningMode === "VIDEO") {
        let nowInMs = Date.now();
        if (lastVideoTime !== video.currentTime) {
          lastVideoTime = video.currentTime;
          results = handLandmarker.detectForVideo(video, nowInMs);
          results.image = video;
          onResultsHands(results);
        }
      }
    },
    width: 640,
    height: 480
  });
  camera.start();
}


function stopBothVideoAndAudio() {
  camera = undefined;
  video.srcObject.getTracks().forEach((track) => {
      if (track.readyState == 'live') {
          track.stop();
      }
  });
}

const setRunningMode = async (running_mode) => {
  if (running_mode === runningMode) return
  canvas.clearRect(0, 0, overlay.width, overlay.height);
  switch(running_mode) {
    case "IMAGE":
      stopBothVideoAndAudio();
      runningMode = running_mode; 
      await handLandmarker.setOptions({ runningMode: running_mode }); 
      return
    case "VIDEO":
      runningMode = running_mode; 
      await handLandmarker.setOptions({ runningMode: running_mode }); 
      startVideo();
      return      
    default:
      window.max.outlet("error", `No running mode: "${running_mode}" exists.`); return
  }
};

const detectImage = async () => {
  let results = handLandmarker.detect(image); 
  results.image = image;
  onResultsHands(results);
};

image.onload = detectImage;

let lastVideoTime = -1;
let results = undefined;
const drawingUtils = new DrawingUtils(canvas);

function onResultsHands(results) {

  canvas.save();
  canvas.clearRect(0, 0, overlay.width, overlay.height);
  
  if(drawImage) {
    canvas.drawImage(results.image, 0, 0, overlay.width, overlay.height);
  }

  const output = {};

  if (results.handednesses) {
    for (const hand of results.handednesses) {
      Object.values(HAND_LANDMARKS).forEach(([landmark, index]) => { 
        try {
          const handIndex = results.handednesses.length > 1 ? Number(hand[0].index) : 0;
          const handName = flipHands ? hand[0].categoryName === "Right" ? "Left" : "Right" : hand[0].categoryName;
          output[handName] = output[handName] || {};
          output[handName][landmark] = results.landmarks[handIndex][index];
        } catch (e) {
          console.error(e);
        }
      });
    }
  }

  if (results.handednesses) {
    for (const hand of results.handednesses) {
      Object.values(HAND_LANDMARKS).forEach(([landmark, index]) => { 
        try {
          const handIndex = results.handednesses.length > 1 ? Number(hand[0].index) : 0;
          const handName = flipHands
            ? (hand[0].categoryName === "Right" ? "Left" : "Right")
            : hand[0].categoryName;
          output[handName] = output[handName] || {};
          output[handName][landmark] = results.landmarks[handIndex][index];
        } catch (e) {
          console.error(e);
        }
      });
    }
  }
  
  if (results.landmarks) {
    // Helper function to evaluate a cubic Bézier curve at parameter t.
    function cubicBezierPoint(P0, P1, P2, P3, t) {
      const oneMinusT = 1 - t;
      const x = oneMinusT * oneMinusT * oneMinusT * P0.x +
                3 * oneMinusT * oneMinusT * t * P1.x +
                3 * oneMinusT * t * t * P2.x +
                t * t * t * P3.x;
      const y = oneMinusT * oneMinusT * oneMinusT * P0.y +
                3 * oneMinusT * oneMinusT * t * P1.y +
                3 * oneMinusT * t * t * P2.y +
                t * t * t * P3.y;
      return { x, y };
    }
  
    // Create an object to store the sampled connecting point from each hand's curve.
    let connectingPoints = {};
  
    results.landmarks.forEach((landmarks, handIdx) => {
      if (drawHands) {
        drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
          color: "#A5A692",
          lineWidth: 1
        });
        drawingUtils.drawLandmarks(landmarks, {
          color: "#011F26",
          fillColor: "#025E73",
          lineWidth: (data) => 1 + data.from.z * -2,
          radius: (data) => DrawingUtils.lerp(data.from.z, -0.15, .1, 2, 1)
        });
      }
      // Ensure we have enough points.
      if (landmarks.length > 8) {
        // Get thumb tip (index 4) and index finger tip (index 8)
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
  
        // Convert normalized coordinates to canvas coordinates.
        const x1 = thumbTip.x * overlay.width;
        const y1 = thumbTip.y * overlay.height;
        const x2 = indexTip.x * overlay.width;
        const y2 = indexTip.y * overlay.height;
  
        // Calculate the midpoint between the two points.
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
  
        // Compute the vector from thumb tip to index tip.
        const dx = x2 - x1;
        const dy = y2 - y1;
  
        // Get a perpendicular vector (-dy, dx).
        let px = -dy;
        let py = dx;
  
        // Normalize the perpendicular vector.
        const mag = Math.sqrt(px * px + py * py);
        if (mag > 0) {
          px /= mag;
          py /= mag;
        }
  
        // Use the wrist (landmark 0) as a reference for the hand’s center.
        const wrist = landmarks[0];
        const wx = wrist.x * overlay.width;
        const wy = wrist.y * overlay.height;
  
        // Compute the vector from the wrist to the midpoint.
        const vx = mx - wx;
        const vy = my - wy;
        const dot = vx * px + vy * py;
        if (dot < 0) {
          px = -px;
          py = -py;
        }
  
        // Set an offset for the curvature.
        const offset = 30;
  
        // Define a simple linear interpolation function.
        const lerp = (a, b, t) => a + (b - a) * t;
  
        // Introduce asymmetry by using different interpolation factors and offsets.
        const p1Interp = 0.1;    // First control point interpolation factor.
        const p2Interp = 0.9;    // Second control point interpolation factor.
        const p1Offset = offset; // Offset for first control point.
        const p2Offset = offset * 1.2; // Offset for second control point.
  
        // Calculate control points for the cubic Bézier curve.
        const p1x = lerp(x1, x2, p1Interp) + px * p1Offset;
        const p1y = lerp(y1, y2, p1Interp) + py * p1Offset;
        const p2x = lerp(x1, x2, p2Interp) + px * p2Offset;
        const p2y = lerp(y1, y2, p2Interp) + py * p2Offset;
  
        // Draw the cubic Bézier curve from thumb tip to index tip.
        canvas.beginPath();
        canvas.moveTo(x1, y1);
        canvas.bezierCurveTo(p1x, p1y, p2x, p2y, x2, y2);
        canvas.strokeStyle = "#025E73";
        canvas.lineWidth = 2;
        canvas.stroke();
  
        // Sample a point on the drawn curve.
        // (Adjust sampleT from 0 to 1 as needed; here, we choose t = 0.5.)
        const sampleT = 0.5;
        const P0 = { x: x1, y: y1 };
        const P1 = { x: p1x, y: p1y };
        const P2 = { x: p2x, y: p2y };
        const P3 = { x: x2, y: y2 };
        const samplePoint = cubicBezierPoint(P0, P1, P2, P3, sampleT);
  
        // Determine a hand identifier from handedness if available.
        let handName = "hand" + handIdx;
        if (results.handednesses && results.handednesses[handIdx] && results.handednesses[handIdx][0]) {
          handName = flipHands
            ? (results.handednesses[handIdx][0].categoryName === "Right" ? "Left" : "Right")
            : results.handednesses[handIdx][0].categoryName;
        }
  
        // Save the sampled point for this hand.
        connectingPoints[handName] = samplePoint;
  
        // Calculate the straight-line distance between thumb and index (for output purposes).
        const distance = Math.sqrt(dx * dx + dy * dy);
        outputMax("distance " + handName + " " + distance);
      }
    });
  
    // After processing all hands, if both left and right sample points are available,
    // draw a straight line connecting these points and compute its distance (distH).
    if (connectingPoints["Left"] && connectingPoints["Right"]) {
      canvas.beginPath();
      canvas.moveTo(connectingPoints["Left"].x, connectingPoints["Left"].y);
      canvas.lineTo(connectingPoints["Right"].x, connectingPoints["Right"].y);
      canvas.strokeStyle = "#F2A71B"; // Adjusted colour.
      canvas.lineWidth = 2;
      canvas.stroke();
  
      // Calculate the distance between the two connecting points (distH).
      const dxH = connectingPoints["Right"].x - connectingPoints["Left"].x;
      const dyH = connectingPoints["Right"].y - connectingPoints["Left"].y;
      const distH = Math.sqrt(dxH * dxH + dyH * dyH);
  
      // Compute the midpoint of the connecting line.
      const midX = (connectingPoints["Left"].x + connectingPoints["Right"].x) / 2;
      const midY = (connectingPoints["Left"].y + connectingPoints["Right"].y) / 2;
  
      // Display distH on the sketch.
      canvas.font = "16px Arial";
      canvas.fillStyle = "#F2A71B";
      canvas.fillText(distH.toFixed(2), midX, midY);
    }
  }
  setMaxDict(output);
  outputMax("update");
  canvas.restore();  
}

const filesetResolver = await FilesetResolver.forVisionTasks(
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
);
handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
  baseOptions: {
    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
    delegate: "GPU"
  },
  runningMode: runningMode,
  numHands: 2
});

getVideoDevicesForMax();
startVideo();

})(); // end IIFE
