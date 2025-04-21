// Your code will go here

// Open up your console - if everything loaded properly you should see the version number
// corresponding to the latest version of ml5 printed to the console and in the p5.js canvas.

// Initialize the Image Classifier method with MobileNet
let mobileNet;

let video;

console.log("ml5 version:", ml5.version);

// When the model is loaded
function modelReady() {
  console.log("Model is ready!");
  mobileNet.predict(gotResults);
}

function gotResults(error, results) {
  if (error) {
    console.error(error);
  } else {
    // Clear existing list items
    document.getElementById("aList").innerHTML = "";
    document.getElementById("bList").innerHTML = "";
    document.getElementById("cList").innerHTML = "";

    let rstls = results[0];

    // First list
    let alist = document.getElementById("aList");
    for (const [key, value] of Object.entries(rstls)) {
      let li = document.createElement("li");
      li.innerText = `${key}: ${value}`;
      alist.appendChild(li);
    }

    // Second list
    let bList = document.getElementById("bList");
    if (results[1]) {
      // Add check to ensure results[1] exists
      for (const [key, value] of Object.entries(results[1])) {
        let li = document.createElement("li");
        li.innerText = `${key}: ${value}`;
        bList.appendChild(li);
      }
    }

    // Third list
    let cList = document.getElementById("cList");
    if (results[2]) {
      // Add check to ensure results[2] exists
      for (const [key, value] of Object.entries(results[2])) {
        let li = document.createElement("li");
        li.innerText = `${key}: ${value}`;
        cList.appendChild(li);
      }
    }

    // Debug logging
    console.log("Results:", results);
    console.log("List A items:", alist.children.length);
    console.log("List B items:", bList.children.length);
    console.log("List C items:", cList.children.length);

    let birdName = Object.values(rstls.label);
    fill(0);
    textSize(64);
    text(birdName, 250, height - 100);

    //doesn't work, as it shows 'undefined'
    let prob = results[0].probability;
    console.log(prob);
    console.log(typeof prob);
    createP(prob);
    // call self again
    mobileNet.predict(gotResults);
  }
}

// function imageReady() {
// 	image(puffin, 0, 0, width, height);
// }

function setup() {
  createCanvas(640, 480);
  video = createCapture(VIDEO);
  //puffin = createImg('images/puffin.jpg', 'a puffin bird', imageReady);
  video.hide();
  background(200);
  textSize(width / 3);
  textAlign(CENTER, CENTER);
  mobileNet = ml5.imageClassifier("MobileNet", video, modelReady);
  // the version number does not get printed out! :<
  createP("ml5 version: " + ml5.version);
}

function draw() {
  image(video, 0, 0);
}
