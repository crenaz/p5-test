// Your code will go here

// Open up your console - if everything loaded properly you should see the version number 
// corresponding to the latest version of ml5 printed to the console and in the p5.js canvas.

// Initialize the Image Classifier method with MobileNet
let mobileNet;

let video; 

console.log('ml5 version:', ml5.version);

// When the model is loaded
function modelReady() {
	console.log('Model is ready!');
	mobileNet.predict(gotResults);
  }

function gotResults(error, results) {
	if (error) {
		console.error(error);
	} else {
		let rstls = (results[0]);
		// let valores = results[0];
		// console.log(valores);
		// console.log(typeof valores);
		for (const [key, value] of Object.entries(rstls)) {
			console.log(`${key} => ${value}`);
		}

		// for (let key of keys) {
		// 	console.log(`${key}: ${valores[key]}`);
		// }

		let alist = document.getElementById("aList");
		for(const [key, value] of Object.entries(rstls)) {
			let li = document.createElement("li");
			li.innerText = (`${key}: ${value}`);
			alist.appendChild(li);
		}
		let bList = document.getElementById("bList");
		for(const [key, value] of Object.entries(results[1])) {
			let li = document.createElement("li");
			li.innerText = (`${key}: ${value}`);
			bList.appendChild(li);
		}
		let cList = document.getElementById("cList");
		for(const [key, value] of Object.entries(results[2])) {
			let li = document.createElement("li");
			li.innerText = (`${key}: ${value}`);
			cList.appendChild(li);
		}

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

function setup(){
	createCanvas(640, 480);
	video = createCapture(VIDEO);
	//puffin = createImg('images/puffin.jpg', 'a puffin bird', imageReady);
	video.hide();
	background(200);
	textSize(width / 3);
	textAlign(CENTER, CENTER);
	mobileNet = ml5.imageClassifier('MobileNet', video, modelReady);
	// the version number does not get printed out! :<
	createP('ml5 version:', `${ml5.version}`);
}

function draw(){
	image(video, 0, 0);

}