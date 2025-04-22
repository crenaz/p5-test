let video;
let detector;
let detections = [];
let idCount = 0;
let confidenceThreshold = 0.5; // 50% default threshold
let frameRateValue = "0.0";
let showBoxes = true;
let showLabels = true;
let showFPS = true;
// Add these constants at the top with other global variables
const PERSISTENCE_TIMEOUT = 60; // Frames before object is removed (currently 100)
const LERP_AMOUNT = 0.8; // Smoothing factor (currently 0.75)
const MAX_MATCHING_DISTANCE = 150; // Maximum pixels distance for matching objects
const MAX_HISTORY_ENTRIES = 100; // Maximum number of history entries to keep
const SIGNIFICANT_CONFIDENCE_CHANGE = 0.15; // 15% confidence change threshold

// Detection zones configuration
let detectionZones = [];
let isDrawingZone = false;
let startPoint = null;
let activeZone = null;

// Statistics tracking
let statistics = {
  totalDetections: 0,
  categoryCount: {},
  sessionStartTime: null,
  lastUpdate: null,
};

// Category color mapping
const categoryColors = {
  person: "#FF0000", // Red
  car: "#00FF00", // Green
  truck: "#0000FF", // Blue
  bicycle: "#FFA500", // Orange
  dog: "#800080", // Purple
  cat: "#FFC0CB", // Pink
  chair: "#008080", // Teal
  bottle: "#FFD700", // Gold
  laptop: "#4B0082", // Indigo
  "cell phone": "#FF1493", // Deep Pink
};

// Add a function to get color for a category
function getCategoryColor(category) {
  // Convert category to lowercase for consistent matching
  const normalizedCategory = category.toLowerCase();

  // Return the mapped color or a default color if category isn't mapped
  return categoryColors[normalizedCategory] || "#4CAF50"; // Default to your original green
}

// Add these configuration options
const ZONE_COLORS = {
  default: { fill: "rgba(0, 255, 0, 0.2)", stroke: "#00FF00" },
  active: { fill: "rgba(255, 165, 0, 0.3)", stroke: "#FFA500" },
};

// Add this function to check if a point is inside a zone
function isPointInZone(x, y, zone) {
  return (
    x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h
  );
}

// Add this function to check if an object intersects with a zone
function isObjectInZone(object, zone) {
  const objectCenterX = object.x + object.width / 2;
  const objectCenterY = object.y + object.height / 2;
  return isPointInZone(objectCenterX, objectCenterY, zone);
}

function preload() {
  console.log("[Setup] Starting preload...");
  detector = ml5.objectDetector("cocossd", {}, modelReady);
}

function modelReady() {
  console.log("[Model] COCO-SSD model loaded successfully");
}

async function setupVideo() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
    });
    console.log("[Camera] Permission granted");
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
    console.error("[Camera] Error accessing camera:", err);
    alert(
      "Could not access the camera. Please make sure you've granted camera permissions."
    );
  }
}

function setupToggleControls() {
  document.getElementById("toggleBoxes").addEventListener("change", (e) => {
    showBoxes = e.target.checked;
  });

  document.getElementById("toggleLabels").addEventListener("change", (e) => {
    showLabels = e.target.checked;
  });

  document.getElementById("toggleFPS").addEventListener("change", (e) => {
    showFPS = e.target.checked;
  });

  // Add export zones button handler
  document
    .getElementById("exportZones")
    .addEventListener("click", exportZoneData);
}

function setup() {
  console.log("Starting setup...");
  let canvas = createCanvas(640, 480);
  canvas.parent("canvas-container");
  setupVideo();
  setupToggleControls();

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

        // Add color indicator
        const color = getCategoryColor(detection.label);
        li.style.borderLeftColor = color;

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
        object.timer = PERSISTENCE_TIMEOUT;
        object.isNew = true; // Flag for new objects
      } else {
        // Find the closest matching object
        let recordDist = MAX_MATCHING_DISTANCE;
        let closest = null;
        for (let candidate of existing) {
          let d = dist(candidate.x, candidate.y, object.x, object.y);
          if (d < recordDist && !candidate.taken) {
            recordDist = d;
            closest = candidate;
          }
        }
        if (closest) {
          // Smooth position updates
          closest.x = lerp(object.x, closest.x, LERP_AMOUNT);
          closest.y = lerp(object.y, closest.y, LERP_AMOUNT);
          closest.width = lerp(object.width, closest.width, LERP_AMOUNT);
          closest.height = lerp(object.height, closest.height, LERP_AMOUNT);
          closest.confidence = object.confidence; // Update confidence
          closest.taken = true;
          closest.timer = PERSISTENCE_TIMEOUT;
          closest.isNew = false;
        } else {
          // Create new object if no match found
          object.id = idCount;
          idCount++;
          object.timer = PERSISTENCE_TIMEOUT;
          object.isNew = true;
          existing.push(object);
        }
      }
    } else {
      object.id = idCount;
      idCount++;
      object.timer = PERSISTENCE_TIMEOUT;
      object.isNew = true;
      detections[label] = [object];
    }
  }

  // Update zone statistics
  detectionZones.forEach((zone) => {
    // Clear current objects
    zone.objectsInside = {};

    // Check each detection
    Object.keys(detections).forEach((label) => {
      detections[label].forEach((object) => {
        if (isObjectInZone(object, zone)) {
          zone.objectsInside[object.id] = {
            label: object.label,
            confidence: object.confidence,
            timestamp: new Date(),
          };
          zone.stats.totalDetections++;
          zone.stats.lastDetection = new Date();
        }
      });
    });

    zone.stats.currentObjects = Object.keys(zone.objectsInside).length;
  });

  // Update statistics display
  updateZoneStatistics();

  // Log detection events
  filteredResults.forEach((detection) => {
    if (detection.isNew) {
      logDetectionEvent(detection, "new");
    } else {
      logDetectionEvent(detection);
    }
  });

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
          const objectColor = getCategoryColor(object.label);
          const alpha = map(object.timer, 0, PERSISTENCE_TIMEOUT, 0, 255);

          // Draw rectangle if enabled
          if (showBoxes) {
            stroke(objectColor);
            strokeWeight(4);
            noFill();
            rect(object.x, object.y, object.width, object.height);

            // Add persistence indicator
            const persistenceWidth = map(
              object.timer,
              0,
              PERSISTENCE_TIMEOUT,
              0,
              object.width
            );
            noStroke();
            fill(objectColor + "40"); // 25% opacity
            rect(object.x, object.y - 5, persistenceWidth, 3);
          }

          // Draw label if enabled
          if (showLabels) {
            const labelText = `${object.label} ${object.id}`;
            const textWidth = textSize() * labelText.length * 0.6;

            // Background for label
            fill(objectColor + "80");
            noStroke();
            rect(
              object.x + 10,
              object.y + 24 - textSize(),
              textWidth,
              textSize() + 4
            );

            // Label text
            fill(255);
            textSize(16);
            text(labelText, object.x + 10, object.y + 24);

            // Confidence and timer
            textSize(12);
            text(
              `Conf: ${(object.confidence * 100).toFixed(0)}% | T: ${
                object.timer
              }`,
              object.x + 10,
              object.y + 40
            );
          }
        }

        // Decrease timer
        object.timer -= 1;
        if (object.timer < 0) {
          objects.splice(i, 1);
        }
      }
    }

    // Draw detection zones
    detectionZones.forEach((zone) => {
      const isActive = Object.keys(zone.objectsInside).length > 0;
      const colors = isActive ? ZONE_COLORS.active : ZONE_COLORS.default;

      // Draw zone
      fill(colors.fill);
      stroke(colors.stroke);
      strokeWeight(2);
      rect(zone.x, zone.y, zone.w, zone.h);

      // Draw zone label
      noStroke();
      fill(0);
      textSize(14);
      text(`Zone ${zone.id + 1}`, zone.x + 5, zone.y + 20);
      text(
        `Objects: ${Object.keys(zone.objectsInside).length}`,
        zone.x + 5,
        zone.y + 40
      );
    });

    // Draw zone being created
    if (isDrawingZone && startPoint) {
      const w = mouseX - startPoint.x;
      const h = mouseY - startPoint.y;
      fill(ZONE_COLORS.default.fill);
      stroke(ZONE_COLORS.default.stroke);
      strokeWeight(2);
      rect(
        w > 0 ? startPoint.x : mouseX,
        h > 0 ? startPoint.y : mouseY,
        Math.abs(w),
        Math.abs(h)
      );
    }

    // Draw frame rate if enabled
    if (showFPS) {
      push();
      noStroke();
      fill(0, 0, 0, 100);
      rect(10, 10, 100, 30);
      fill(255, 0, 0);
      textSize(18);
      textStyle(BOLD);
      textAlign(LEFT, CENTER);
      text(`FPS: ${frameRateValue}`, 20, 25);
      pop();
    }
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
    zones: detectionZones.map((zone) => ({
      id: zone.id,
      dimensions: {
        x: zone.x,
        y: zone.y,
        width: zone.w,
        height: zone.h,
      },
      stats: zone.stats,
    })),
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

// Add mouse interaction functions
function mousePressed() {
  if (mouseX < width && mouseY < height) {
    isDrawingZone = true;
    startPoint = { x: mouseX, y: mouseY };
  }
}

function mouseDragged() {
  // Update for live preview while drawing
  if (isDrawingZone && startPoint) {
    // Will be drawn in the draw() function
  }
}

function mouseReleased() {
  if (isDrawingZone && startPoint) {
    const w = mouseX - startPoint.x;
    const h = mouseY - startPoint.y;

    // Only create zone if it has some size
    if (Math.abs(w) > 10 && Math.abs(h) > 10) {
      const newZone = {
        x: w > 0 ? startPoint.x : mouseX,
        y: h > 0 ? startPoint.y : mouseY,
        w: Math.abs(w),
        h: Math.abs(h),
        id: detectionZones.length,
        objectsInside: {},
        stats: {
          totalDetections: 0,
          currentObjects: 0,
          lastDetection: null,
        },
      };
      detectionZones.push(newZone);
    }
    isDrawingZone = false;
    startPoint = null;
  }
}

// Add this function to update the statistics display
function updateZoneStatistics() {
  const aList = document.getElementById("aList");
  if (aList) {
    // Add zone statistics to the list
    detectionZones.forEach((zone) => {
      const zoneHeader = document.createElement("li");
      zoneHeader.classList.add("zone-stats");
      zoneHeader.innerHTML = `
                <strong>Zone ${zone.id + 1}</strong><br>
                Current Objects: ${zone.stats.currentObjects}<br>
                Total Detections: ${zone.stats.totalDetections}<br>
                ${
                  zone.stats.lastDetection
                    ? `Last Detection: ${zone.stats.lastDetection.toLocaleTimeString()}`
                    : "No detections yet"
                }
            `;
      aList.appendChild(zoneHeader);
    });
  }
}

function exportZoneData() {
  const button = document.getElementById("exportZones");
  button.classList.add("loading");

  // Prepare the export data
  const exportData = {
    timestamp: new Date().toISOString(),
    totalZones: detectionZones.length,
    zones: detectionZones.map((zone) => ({
      id: zone.id,
      dimensions: {
        x: zone.x,
        y: zone.y,
        width: zone.w,
        height: zone.h,
      },
      statistics: {
        totalDetections: zone.stats.totalDetections,
        currentObjects: zone.stats.currentObjects,
        lastDetection: zone.stats.lastDetection
          ? zone.stats.lastDetection.toISOString()
          : null,
      },
      currentObjects: Object.entries(zone.objectsInside).map(([id, obj]) => ({
        id: id,
        label: obj.label,
        confidence: obj.confidence,
        lastSeen: obj.timestamp.toISOString(),
      })),
    })),
    sessionStatistics: {
      ...statistics,
      sessionStartTime: statistics.sessionStartTime
        ? statistics.sessionStartTime.toISOString()
        : null,
      lastUpdate: statistics.lastUpdate
        ? statistics.lastUpdate.toISOString()
        : null,
    },
  };

  // Create the file
  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `detection-zones-${timestamp}.json`;

  // Create and trigger download
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  // Add to document, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Cleanup
  URL.revokeObjectURL(url);
  button.classList.remove("loading");

  // Show success feedback
  const originalText = button.textContent;
  button.textContent = "✓ Exported!";
  button.disabled = true;

  setTimeout(() => {
    button.textContent = originalText;
    button.disabled = false;
  }, 2000);
}

// Optional: Add a function to format the detection data nicely
function formatDetectionData(detection) {
  return {
    label: detection.label,
    confidence: Number(detection.confidence.toFixed(3)),
    position: {
      x: Math.round(detection.x),
      y: Math.round(detection.y),
      width: Math.round(detection.width),
      height: Math.round(detection.height),
    },
  };
}

// Add this function to handle history logging
function logDetectionEvent(detection, eventType = "detection") {
  const timestamp = Date.now();
  const entry = {
    id: detection.id,
    label: detection.label,
    confidence: detection.confidence,
    timestamp: timestamp,
    eventType: eventType,
    position: {
      x: Math.round(detection.x),
      y: Math.round(detection.y),
    },
    zone: getCurrentZone(detection),
  };

  // Check for significant confidence changes
  const previousEntry = detectionHistory.entries
    .filter((e) => e.id === detection.id)
    .pop();

  if (
    previousEntry &&
    Math.abs(previousEntry.confidence - detection.confidence) >
      SIGNIFICANT_CONFIDENCE_CHANGE
  ) {
    entry.eventType = "confidence_change";
    detectionHistory.statistics.confidenceChanges++;
  }

  // Update statistics
  detectionHistory.statistics.totalEvents++;
  detectionHistory.statistics.uniqueObjects.add(
    `${detection.label}_${detection.id}`
  );

  // Add entry to history
  detectionHistory.entries.unshift(entry);

  // Trim history if needed
  if (detectionHistory.entries.length > MAX_HISTORY_ENTRIES) {
    detectionHistory.entries = detectionHistory.entries.slice(
      0,
      MAX_HISTORY_ENTRIES
    );
  }

  // Update UI
  updateHistoryDisplay();
}

// Helper function to get current zone
function getCurrentZone(detection) {
  for (let zone of detectionZones) {
    if (isObjectInZone(detection, zone)) {
      return zone.id;
    }
  }
  return null;
}

// Add this function to update the history display
function updateHistoryDisplay() {
  const historyList = document.getElementById("historyList");
  if (!historyList) return;

  historyList.innerHTML = "";

  // Add statistics summary
  const statsHeader = document.createElement("li");
  statsHeader.classList.add("history-stats");
  statsHeader.innerHTML = `
      <strong>Detection History Statistics</strong><br>
      Total Events: ${detectionHistory.statistics.totalEvents}<br>
      Unique Objects: ${detectionHistory.statistics.uniqueObjects.size}<br>
      Confidence Changes: ${detectionHistory.statistics.confidenceChanges}
  `;
  historyList.appendChild(statsHeader);

  // Add recent events
  detectionHistory.entries.slice(0, 10).forEach((entry) => {
    const li = document.createElement("li");
    li.classList.add("history-entry");
    li.classList.add(`event-${entry.eventType}`);

    const timeDiff = Date.now() - entry.timestamp;
    const timeAgo = formatTimeAgo(timeDiff);

    li.innerHTML = `
        <span class="history-time">${timeAgo}</span>
        <span class="history-label">${entry.label} #${entry.id}</span>
        <span class="history-confidence">${(entry.confidence * 100).toFixed(
          1
        )}%</span>
        ${
          entry.zone !== null
            ? `<span class="history-zone">Zone ${entry.zone + 1}</span>`
            : ""
        }
    `;

    historyList.appendChild(li);
  });
}

// Helper function to format time ago
function formatTimeAgo(ms) {
  if (ms < 1000) return "just now";
  if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  return `${Math.floor(ms / 3600000)}h ago`;
}
