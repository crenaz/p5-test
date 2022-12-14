let video;
let detector;
let detections = [];

function preload() {
    //img = loadImage('../images/puffin.jpg');
    detector = ml5.objectDetector('cocossd');
}

function gotDetections (error, results) {
    if (error) {
        console.error(error);
    } else {
        console.log(results);
        detections = results;
        
    }
}

function setup() {
    createCanvas(640, 480);
    video = createCapture(VIDEO);
    video.size(640,480);
    video.hide();
    console.log(detector);
    //image(img, 0, 0);
    detector.detect(video, gotDetections);
}

function draw() {
    image(video, 0, 0);

    for (let i = 0; i < detections.length; i++) {
        stroke(0, 255, 0);
         let object = detections[i];
       strokeWeight(4);
        noFill();
        rect(object.x, object.y, object.width, object.height);
        noStroke();
        textSize(24);
        console.log(object.label);
        text(object.label, object.x + 10, object.y +24 );
    }
}