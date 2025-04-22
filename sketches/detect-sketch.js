let video;
let detector;
let detections = [];
let idCount = 0;
let confidenceThreshold = 0.5; // 50% default threshold
let frameRateValue = "0.0";

// Add statistics object
let statistics = {
  totalDetections: 0,
  categoryCount: {},
  sessionStartTime: null,
  lastUpdate: null,
};

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

  // Initialize session start time if not set
  if (!statistics.sessionStartTime) {
    statistics.sessionStartTime = new Date();
  }
  statistics.lastUpdate = new Date();

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

  // Update statistics
  filteredResults.forEach((detection) => {
    statistics.totalDetections++;
    statistics.categoryCount[detection.label] =
      (statistics.categoryCount[detection.label] || 0) + 1;
  });

  // Update the aList element with detections and statistics
  const aList = document.getElementById("aList");
  if (aList) {
    // Clear previous detections
    aList.innerHTML = "";

    // Add statistics summary
    const statsHeader = document.createElement("li");
    statsHeader.classList.add("stats-header");
    statsHeader.innerHTML = `
        <strong>Session Statistics:</strong><br>
        Total Detections: ${statistics.totalDetections}<br>
        Session Duration: ${getSessionDuration()}<br>
        Categories Detected: ${Object.keys(statistics.categoryCount).length}
    `;
    aList.appendChild(statsHeader);

    // Add category breakdown
    Object.entries(statistics.categoryCount)
      .sort(([, a], [, b]) => b - a) // Sort by count, descending
      .forEach(([category, count]) => {
        const statItem = document.createElement("li");
        statItem.classList.add("stat-item");
        statItem.textContent = `${category}: ${count} detections`;
        aList.appendChild(statItem);
      });

    // Add current detections
    if (filteredResults && filteredResults.length > 0) {
      const currentHeader = document.createElement("li");
      currentHeader.classList.add("current-header");
      currentHeader.innerHTML = "<strong>Current Detections:</strong>";
      aList.appendChild(currentHeader);

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
  // Update frame rate value every 10 frames
  if (frameCount % 10 === 0) {
    frameRateValue = frameRate().toFixed(1);
  }

  // Only draw if video is ready
  if (video && video.elt.readyState === video.elt.HAVE_ENOUGH_DATA) {
    image(video, 0, 0);

    let labels = Object.keys(detections);
    for (let label of labels) {
      let objects = detections[label];
      for (let i = objects.length - 1; i >= 0; i--) {
        let object = objects[i];
        if (object.label !== "person") {
          stroke(0, 255, 0);
          strokeWeight(4);
          fill(0, 255, 0, object.timer);
          rect(object.x, object.y, object.width, object.height);

          noStroke();
          fill(0);
          textSize(32);
          text(`${object.label} ${object.id}`, object.x + 10, object.y + 24);
        }
        object.timer -= 2;
        if (object.timer < 0) {
          objects.splice(i, 1);
        }
      }
    }

    // Draw frame rate with red color and reduced opacity background
    push();
    noStroke();
    fill(0, 0, 0, 100); // Reduced opacity to 100
    rect(10, 10, 100, 30);
    fill(255, 0, 0); // Keeping the bright red text
    textSize(18);
    textStyle(BOLD);
    textAlign(LEFT, CENTER);
    text(`FPS: ${frameRateValue}`, 20, 25);
    pop();
  } else {
    background(200);
    fill(0);
    noStroke();
    textSize(24);
    textAlign(CENTER, CENTER);
    text("Loading video...", width / 2, height / 2);
  }
}

// Helper function to calculate session duration
function getSessionDuration() {
  if (!statistics.sessionStartTime) return "Not started";

  const diff = new Date() - statistics.sessionStartTime;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Add function to export statistics
function exportStatistics() {
  const exportData = {
    ...statistics,
    sessionStartTime: statistics.sessionStartTime.toISOString(),
    lastUpdate: statistics.lastUpdate.toISOString(),
  };

  const dataStr = JSON.stringify(exportData, null, 2);
  const dataUri =
    "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

  const exportName = `detection-stats-${new Date().toISOString()}.json`;

  const linkElement = document.createElement("a");
  linkElement.setAttribute("href", dataUri);
  linkElement.setAttribute("download", exportName);
  linkElement.click();
}
