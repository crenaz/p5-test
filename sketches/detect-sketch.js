let video;
let detector;
let detections = [];
let idCount = 0;
let confidenceThreshold = 0.5; // 50% default threshold

function preload() {
  console.log("Starting preload...");
  detector = ml5.objectDetector("cocossd", {}, modelReady);
}

function modelReady() {
  console.log("Model Loaded!");
}

async function setupVideo() {
  try {
    // First ask for permission explicitly
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
    });

    console.log("Camera permission granted");

    // Create video element with the stream
    video = createCapture(VIDEO);
    video.size(640, 480);
    video.hide();

    // Start detection once video is ready
    video.elt.addEventListener("loadeddata", () => {
      console.log("Video is ready");
      detector.detect(video, gotDetections);
    });
  } catch (err) {
    console.error("Error accessing camera:", err);
    alert(
      "Could not access the camera. Please make sure you've granted camera permissions."
    );
  }
}

function setup() {
  console.log("Starting setup...");
  let canvas = createCanvas(640, 480);
  canvas.parent("canvas-container");
  setupVideo();

  // Setup threshold slider
  const slider = document.getElementById("confidenceThreshold");
  const thresholdValue = document.getElementById("thresholdValue");

  // Set initial value
  thresholdValue.textContent = slider.value;

  slider.addEventListener("input", function () {
    confidenceThreshold = this.value / 100;
    thresholdValue.textContent = this.value;
  });
}

function gotDetections(error, results) {
  if (error) {
    console.error("Detection error:", error);
    return;
  }

  // Only continue if video is ready
  if (!video || !video.elt.readyState === video.elt.HAVE_ENOUGH_DATA) {
    console.log("Waiting for video...");
    requestAnimationFrame(() => detector.detect(video, gotDetections));
    return;
  }

  // Filter results based on confidence threshold
  const filteredResults = results.filter(
    (detection) => detection.confidence >= confidenceThreshold
  );

  // Update the aList element with detections
  const aList = document.getElementById("aList");
  if (aList) {
    // Clear previous detections
    aList.innerHTML = "";

    if (filteredResults && filteredResults.length > 0) {
      // Sort results by confidence
      filteredResults.sort((a, b) => b.confidence - a.confidence);

      filteredResults.forEach((detection) => {
        const li = document.createElement("li");
        const confidence = (detection.confidence * 100).toFixed(1);
        li.textContent = `${
          detection.label
        }: ${confidence}% confidence (x: ${Math.round(
          detection.x
        )}, y: ${Math.round(detection.y)})`;
        if (detection.confidence > 0.8) {
          li.classList.add("high-confidence");
        }
        aList.appendChild(li);
      });
    } else {
      const li = document.createElement("li");
      li.textContent =
        filteredResults.length === 0
          ? "No objects above confidence threshold"
          : "No objects detected";
      li.classList.add("no-detection");
      aList.appendChild(li);
    }
  }

  // Update visualization
  detections = {};
  for (let i = 0; i < filteredResults.length; i++) {
    let object = filteredResults[i];
    let label = object.label;

    if (detections[label]) {
      let existing = detections[label];
      if (existing.length == 0) {
        object.id = idCount;
        idCount++;
        existing.push(object);
        object.timer = 100;
      } else {
        // Find the object closest?
        let recordDist = Infinity;
        let closest = null;
        for (let candidate of existing) {
          let d = dist(candidate.x, candidate.y, object.x, object.y);
          if (d < recordDist && !candidate.taken) {
            recordDist = d;
            closest = candidate;
          }
        }
        if (closest) {
          // copy x,y,w,h
          let amt = 0.75;
          closest.x = lerp(object.x, closest.x, amt);
          closest.y = lerp(object.y, closest.y, amt);
          closest.width = lerp(object.width, closest.width, amt);
          closest.height = lerp(object.height, closest.height, amt);
          closest.taken = true;
          closest.timer = 100;
        } else {
          object.id = idCount;
          idCount++;
          existing.push(object);
          object.timer = 100;
        }
      }
    } else {
      object.id = idCount;
      idCount++;
      detections[label] = [object];
      object.timer = 100;
    }
  }

  // Continue detection
  detector.detect(video, gotDetections);
}

function draw() {
  // Only draw if video is ready
  if (video && video.elt.readyState === video.elt.HAVE_ENOUGH_DATA) {
    image(video, 0, 0);

    let labels = Object.keys(detections);
    for (let label of labels) {
      let objects = detections[label];
      for (let i = objects.length - 1; i >= 0; i--) {
        let object = objects[i];
        if (object.label !== "person") {
          // Draw rectangle
          stroke(0, 255, 0);
          strokeWeight(4);
          fill(0, 255, 0, object.timer);
          rect(object.x, object.y, object.width, object.height);

          // Draw label text
          noStroke();
          fill(0);
          textSize(32);
          let labelText = `${object.label} ${object.id}`;
          text(labelText, object.x + 10, object.y + 24);
        }
        object.timer -= 2;
        if (object.timer < 0) {
          objects.splice(i, 1);
        }
      }
    }
  } else {
    // Draw loading message
    background(200);
    fill(0);
    noStroke();
    textSize(24);
    textAlign(CENTER, CENTER);
    text("Loading video...", width / 2, height / 2);
  }
}
