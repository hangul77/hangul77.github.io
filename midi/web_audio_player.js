/*
 * Circular Web Audio Buffer Queue
 */
function CircularAudioBuffer(slots) {
	slots = slots || 24; // number of buffers
	this.slots = slots;
	this.buffers = new Array(slots);

	this.reset();

	for (var i = 0; i < slots; i++) {
		var buffer = audioCtx.createBuffer(channels, BUFFER, SAMPLE_RATE);
		this.buffers[i] = buffer;
	}
}

// pseudo empty all buffers
CircularAudioBuffer.prototype.reset = function() {
	this.used = 0;
	this.filled = 0;	
};

// returns number of buffers that are filled
CircularAudioBuffer.prototype.filledBuffers = function() {
	var fills = this.filled - this.used;
	if (fills < 0) fills += this.slots;
	return fills;
}

// returns whether buffers are all filled
CircularAudioBuffer.prototype.full = function() {
	return this.filledBuffers() >= this.slots - 1;
}

// returns a reference to next available buffer to be filled
CircularAudioBuffer.prototype.prepare = function() {
	if (this.full()) {
		console.log('buffers full!!')
		return
	}
	var buffer = this.buffers[this.filled++];
	this.filled %= this.slots;
	return buffer;
}

// returns the next buffer in the queue
CircularAudioBuffer.prototype.use = function() {
	if (!this.filledBuffers()) return;
	var buffer = this.buffers[this.used++];
	this.used %= this.slots;
	return buffer;
}


/*
 * Web Audio Stuff
 */

var SAMPLE_RATE = 44100;
var BUFFER = 4096; // buffer sample
var channels = 2;

// Create AudioContext and buffer source
//var a=window.AudioContext || window.webkitAudioContext;
var audioCtx = new AudioContext();
var source = audioCtx.createBufferSource();
var scriptNode = audioCtx.createScriptProcessor(BUFFER, 0, channels);

var circularBuffer = new CircularAudioBuffer(4);

var emptyBuffer = audioCtx.createBuffer(channels, BUFFER, SAMPLE_RATE);

scriptNode.onaudioprocess = onAudioProcess;
//source.connect(scriptNode);
if (!audioCtx.createGain) audioCtx.createGain = audioCtx.createGainNode;
var gainNode = audioCtx.createGain();
//gainNode.connect(scriptNode);

source.connect(gainNode);
source.start(0);

var aconnected;
function startAudio() {
	//gainNode.gain.value=0.1;
	//scriptNode.connect(audioCtx.destination);
	if(aconnected){
		return;
	}
	aconnected=true;	
	scriptNode.connect(gainNode);
	gainNode.connect(audioCtx.destination);
}

function pauseAudio() {
	//source.stop(0);
	//source.noteOff(0);
	//source.disconnect(scriptNode);
	//scriptNode.disconnect();
	//gainNode.disconnect();
}

// Give the node a function to process audio events
function onAudioProcess(audioProcessingEvent) {
	var generated = circularBuffer.use();

	if (!generated && pauseAudioAfterDrainingBuffer) {
		// wait for remaining buffer to drain before disconnect audio
		pauseAudio();
		pauseAudioAfterDrainingBuffer = false;
		signalStop = 0;
		if (callbackOnStop) callbackOnStop();
		callbackOnStop = null;
		return;
	}
	if (!generated) {
		//console.log('buffer under run!!')
		generated = emptyBuffer;
	}

	var outputBuffer = audioProcessingEvent.outputBuffer;
	var offset = 0;
	//https://github.com/mohayonao/web-audio-api-shim
	outputBuffer.copyToChannel(generated.getChannelData(0), 0, offset);
	outputBuffer.copyToChannel(generated.getChannelData(1), 1, offset);
}

/*
// debugging stats
setInterval(function() {
	console.log('audio queue', circularBuffer.filledBuffers());
}, 5000);
*/
