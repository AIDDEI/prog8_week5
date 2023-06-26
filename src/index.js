// Globals
let model;
let videoWidth, videoHeight;
let ctx, canvas;
const log = document.querySelector("#array");
const VIDEO_WIDTH = 720;
const VIDEO_HEIGHT = 405;
let knnKeyPoints;
const k = 4;
const machine = new kNear(k);
let synth = window.speechSynthesis

const trainButton = document.getElementById("trainButton");
trainButton.addEventListener("click", captureHand);

const predictButton = document.getElementById("predictButton");
predictButton.addEventListener("click", predictPose);

let predictionPlaceholder = document.getElementById("prediction");
let p = document.createElement("p");
p.innerHTML = "Train het model op de verschillende handhoudingen en laat het erna je handhouding voorspellen!"
predictionPlaceholder.appendChild(p);

// Start the application
async function main() {
    model = await handpose.load();
    const video = await setupCamera();
    video.play();
    startLandmarkDetection(video);
}

// Start the webcam
async function setupCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
            "Webcam not available"
        );
    }

    const video = document.getElementById("video");
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
            facingMode: "user",
            width: VIDEO_WIDTH,
            height: VIDEO_HEIGHT,
        },
    });
    video.srcObject = stream;

    return new Promise(resolve => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

// predict finger positions in video stream
async function startLandmarkDetection(video) {
    videoWidth = video.videoWidth;
    videoHeight = video.videoHeight;

    canvas = document.getElementById("output");

    canvas.width = videoWidth;
    canvas.height = videoHeight;

    ctx = canvas.getContext("2d");

    video.width = videoWidth;
    video.height = videoHeight;

    ctx.clearRect(0, 0, videoWidth, videoHeight);
    ctx.strokeStyle = "red";
    ctx.fillStyle = "red";

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    predictLandmarks();
}

// predict location of the fingers
async function predictLandmarks() {
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight, 0, 0, canvas.width, canvas.height);

    const predictions = await model.estimateHands(video);
    if (predictions.length > 0) {
        drawHand(ctx, predictions[0].landmarks, predictions[0].annotations);

        let [thumbY, thumbX, thumbZ] = predictions[0].annotations.thumb[4];
        let thumbArray = [thumbX, thumbY, thumbZ];

        let [indexY, indexX, indexZ] = predictions[0].annotations.indexFinger[4];
        let indexFingerArray = [indexX, indexY, indexZ];

        let [middleY, middleX, middleZ] = predictions[0].annotations.middleFinger[4];
        let middleFingerArray = [middleX, middleY, middleZ];

        let [ringY, ringX, ringZ] = predictions[0].annotations.ringFinger[4];
        let ringFingerArray = [ringX, ringY, ringZ];

        let [pinkyY, pinkyX, pinkyZ] = predictions[0].annotations.pinky[4];
        let pinkyArray = [pinkyX, pinkyY, pinkyZ];
        
        knnKeyPoints = thumbArray.concat(indexFingerArray, middleFingerArray, ringFingerArray, pinkyArray);
    }

    requestAnimationFrame(predictLandmarks);
}

// Draw hand and fingers with the x and y coördinates
function drawHand(ctx, keypoints, annotations) {
    log.innerHTML = keypoints.flat();

    for (let i = 0; i < keypoints.length; i++) {
        const y = keypoints[i][0];
        const x = keypoints[i][1];
        drawPoint(ctx, x - 2, y - 2, 3);
    }

    let palmBase = annotations.palmBase[0];
    for (let key in annotations) {
        const finger = annotations[key];
        
        finger.unshift(palmBase);
        drawPath(ctx, finger, false);
    }
}

// Draw point
function drawPoint(ctx, y, x, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
}

// Draw line
function drawPath(ctx, points, closePath) {
    const region = new Path2D();
    region.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
        const point = points[i];
        region.lineTo(point[0], point[1]);
    }

    if (closePath) {
        region.closePath();
    }
    ctx.stroke(region);
}

function captureHand() {
    let inputValue = document.getElementById("poseInput").value;
    if (inputValue === ""){
        alert("Voer een geldige handhouding naam in");
    } else {
        machine.learn(knnKeyPoints, inputValue);
        console.log(`${knnKeyPoints}, ${inputValue}`);
    }
}

function predictPose() {
    let prediction = machine.classify(knnKeyPoints);

    predictionPlaceholder.removeChild(p);
    p.innerHTML = prediction;
    predictionPlaceholder.appendChild(p);
    speak(p.innerHTML);
}

function speak(text) {
    if (synth.speaking) {
        console.log('still speaking...')
        return
    }
    if (text !== '') {
        let utterThis = new SpeechSynthesisUtterance(text)
        synth.speak(utterThis)
    }
}

// start
main();