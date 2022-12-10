// Your code will go here

// Open up your console - if everything loaded properly you should see the version number 
// corresponding to the latest version of ml5 printed to the console and in the p5.js canvas.

// Initialize the Image Classifier method with MobileNet
let mobilenet;

let puffin; 

console.log('ml5 version:', ml5.version);

// When the model is loaded
function modelReady() {
	console.log('Model is ready!');
	mobilenet.predict(puffin, gotResults)
  }

function gotResults(error, results) {
	if (error) {
		console.error(error);
	} else {
		console.log(results);
		let label = results[0].className;
		fill(0);
		textSize(64);
		text(label, 10, height - 100);
		createP(label);
	}

}

function imageReady() {
	image(puffin, 0, 0, width, height);
}

function setup(){
	createCanvas(640, 480);
	puffin = createImg('images/puffin.jpg', 'a puffin bird', imageReady);
	puffin.hide();
	background(200);
	textSize(width / 3);
	textAlign(CENTER, CENTER);
	mobilenet = ml5.imageClassifier('MobileNet', modelReady);
}

function draw(){
	
}