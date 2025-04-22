// Global variables
let mobileNet;
let video;
let frameCounter = 0;

function setup() {
  let canvas = createCanvas(640, 480);
  canvas.parent("canvas-container");

  console.log("Starting setup...");

  // Create video capture
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  // Load the model
  console.log("Loading MobileNet...");
  mobileNet = ml5.imageClassifier("MobileNet", modelReady);

  background(200);
  textSize(32);
  textAlign(CENTER, CENTER);
}

function modelReady() {
  console.log("Model is ready!");
  classifyVideo();
}

function classifyVideo() {
  mobileNet.classify(video, gotResults);
}

function gotResults(error, results) {
  if (error) {
    console.error(error);
    return;
  }

  console.log("Got results:", results);

  const aList = document.getElementById("aList");
  const bList = document.getElementById("bList");
  const cList = document.getElementById("cList");

  if (aList && bList && cList) {
    // Clear lists
    aList.innerHTML = bList.innerHTML = cList.innerHTML = "";

    // Update first list - Just primary prediction and confidence
    let li = document.createElement("li");
    li.innerText = `Label: ${results[0].label}`;
    aList.appendChild(li);
    li = document.createElement("li");
    li.innerText = `Confidence: ${(results[0].confidence * 100).toFixed(2)}%`;
    aList.appendChild(li);

    // Update second list - Additional analysis information
    const result = results[0];
    // Split the label into parts if it contains commas
    const labelParts = result.label.split(",");
    labelParts.forEach((part, index) => {
      li = document.createElement("li");
      li.innerText = `Category ${index + 1}: ${part.trim()}`;
      bList.appendChild(li);
    });

    // Add timestamp
    li = document.createElement("li");
    li.innerText = `Timestamp: ${new Date().toLocaleTimeString()}`;
    bList.appendChild(li);

    // Add frame number or counter
    li = document.createElement("li");
    if (!window.frameCounter) window.frameCounter = 0;
    window.frameCounter++;
    li.innerText = `Frame: ${window.frameCounter}`;
    bList.appendChild(li);

    // Update third list - Top 3 predictions
    results.forEach((result, i) => {
      if (i < 3) {
        li = document.createElement("li");
        li.innerText = `${i + 1}. ${result.label} (${(
          result.confidence * 100
        ).toFixed(2)}%)`;
        cList.appendChild(li);
      }
    });
  }

  // Draw label on canvas
  fill(0);
  textSize(32);
  text(results[0].label, width / 2, height - 50);

  // Call classify again
  classifyVideo();
}

function draw() {
  image(video, 0, 0);
}
