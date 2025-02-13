'use strict';

var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var localStream;
var pc;
var remoteStream;
var turnReady;

var pcConfig = {
  'iceServers': [{
    'urls': 'stun:stun.l.google.com:19302'
  }]
};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};

/////////////////////////////////////////////

var room = 'foo';
// Could prompt for room name:
// room = prompt('Enter room name:');

var socket = io.connect();

// 룸이 있는 경우
if (room !== '') {
  socket.emit('create or join', room);
  console.log('Attempted to create or  join room', room);
}

socket.on('created', function (room) {
  console.log('Created room ' + room);
  isInitiator = true;
});

socket.on('full', function (room) {
  console.log('Room ' + room + ' is full');
});

socket.on('join', function (room) {
  console.log('Another peer made a request to join room ' + room);
  console.log('This peer is the initiator of room ' + room + '!');
  isChannelReady = true;
});

socket.on('joined', function (room) {
  console.log('joined: ' + room);
  isChannelReady = true;
});

socket.on('log', function (array) {
  console.log.apply(console, array);
});

socket.on('whiteboard', function (data) {
  console.log("화이트보드보드보드&&&&&")
  designer.syncData(data);
});

////////////////////////////////////////////////

function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', message);
}

// This client receives a message
socket.on('message', function (message) {
  console.log('Client received message:', message);
  if (message === 'got user media') {
    maybeStart();
  } else if (message.type === 'offer') {
    if (!isInitiator && !isStarted) {
      maybeStart();
    }
    pc.setRemoteDescription(new RTCSessionDescription(message));
    doAnswer();
  } else if (message.type === 'answer' && isStarted) {
    pc.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === 'candidate' && isStarted) {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    pc.addIceCandidate(candidate);
  } else if (message === 'bye' && isStarted) {
    handleRemoteHangup();
  }
});

////////////////////////////////////////////////////
const mediaOption = {
  audio: true,
  video: {
    mandatory: {
      maxWidth: 160,
      maxHeight: 120,
      maxFrameRate: 5,
    },
    optional: [
      { googNoiseReduction: true }, // Likely removes the noise in the captured video stream at the expense of computational effort.
      { facingMode: 'user' }, // Select the front/user facing camera or the rear/environment facing camera if available (on Phone)
    ],
  },
};

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');
var shareButton = document.querySelector('button#shareScreenBtn');
var recordButton = document.querySelector('button#recordScreenBtn');
var downloadButton = document.querySelector('button#recordDownloadBtn');
var videoElem = document.querySelector('#videoElem');
var canvas = document.querySelector("#canvas");
var blurVideo = document.querySelector("#blurVideo");
var blurButton = document.querySelector("#blurScreenBtn");
var whiteboardButton = document.querySelector("#whiteboardBtn");
var mediaRecorder;

shareButton.onclick = startCapture;
recordButton.onclick = toggleRecording;
downloadButton.onclick = download;
blurButton.onclick = blurScreen;
whiteboardButton.onclick = startWhiteboard;

navigator.mediaDevices.getUserMedia(mediaOption)
  .then(gotStream)
  .catch(function (e) {
    alert('getUserMedia() error: ' + e.name);
  });


// 화면공유 옵션
const captureOption = {
  audio: true,
  video: true
}

// 화면공유
let captureStream = null;

async function startCapture(captureOption) {
  console.log("공유시작")

  try {
    captureStream = await navigator.mediaDevices.getDisplayMedia(captureOption);
    console.log(captureStream)
    gotStream(captureStream)
    // localVideo.srcObject = captureStream;
    // dumpOptionsInfo();
  } catch (err) {
    console.error("Error: " + err);
  }
  pc.addStream(captureStream);
  // return captureStream;
}

/************************************************************************* */
// 화면 녹화
var recordOption = {
  audio: true,
  video: true
};
// Optional frames per second argument.
var recordedChunks = [];
function handleStop(event) {
  console.log('Recorder stopped: ', event);
  console.log('Recorded Blobs: ', recordedChunks);
}


async function startRecording() {
  var stream = await navigator.mediaDevices.getUserMedia(mediaOption);


  var options = { mimeType: "video/webm; codecs=vp9" };
  mediaRecorder = new MediaRecorder(stream, options);

  mediaRecorder.onstop = handleStop;
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.start(10);

  recordButton.textContent = "녹화 중지";
  console.log('MediaRecorder started', mediaRecorder);
}

function stopRecording() {
  mediaRecorder.stop();
  // recordedVideo.controls = true;
}

function handleDataAvailable(event) {
  console.log("data-available");
  if (event.data.size > 0) {
    recordedChunks.push(event.data);
    console.log(recordedChunks);
    // download();
  } else {
    // ...
  }
}


async function toggleRecording() {
  if (recordButton.textContent === '녹화 시작') {
    await startRecording();
  } else {
    stopRecording();
    recordButton.textContent = '녹화 시작';
    // playButton.disabled = false;
    // downloadButton.disabled = false;
  }
}

function download() {
  var blob = new Blob(recordedChunks, {
    type: "video/webm"
  });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  document.body.appendChild(a);
  a.style = "display: none";
  a.href = url;
  a.download = "test.webm";
  a.click();
  window.URL.revokeObjectURL(url);
}

// 흐린배경
const ctx = canvas.getContext('2d');

localVideo.addEventListener('loadeddata', (event) => {
  console.log('Yay! The readyState just increased to  ' +
    'HAVE_CURRENT_DATA or greater for the first time.');
});

async function blurScreen() {
  canvas.height = localVideo.videoHeight;
  canvas.width = localVideo.videoWidth;

  let options = {
    multiplier: 0.75,
    stride: 32,
    quantBytes: 4
  }

  bodyPix.load(options)
    .then(net => perform(net))
    .catch(err => console.log(err))
  // v.bind('loadeddata', async function (e) {
  //   localVideo.srcObject = await canvas.captureStream(25); // 25 FPS
  // // localVideo.srcObject = ca
  // });
  // gotStream(await canvas.captureStream(25))

  // 
  let blurStream = await canvas.captureStream();
  if (blurStream) {
    localVideo.srcObject = blurStream;
  }
  pc.addStream(blurStream)
  // let blur = blurVideo.captureStream();
  // localVideo.srcObject = blur;
}
async function perform(net) {
  while (1) {
    const segmentation = await net.segmentPerson(localVideo);

    const backgroundBlurAmount = 6;
    const edgeBlurAmount = 2;
    const flipHorizontal = true;

    await bodyPix.drawBokehEffect(canvas, localVideo, segmentation, backgroundBlurAmount, edgeBlurAmount, flipHorizontal);
  }

}


// 화이트보드
var designer = new CanvasDesigner()
designer.appendTo(document.body);
function startWhiteboard() {
  console.log("화이트보드 클릭")
  // designer.toDataURL('image/png', function (dataURL) {
  //   window.open(dataURL);
  // });
  designer.addSyncListener(function (data) {
    console.log("whiteboard================================")
    console.log(data)
    socket.emit('whiteboard', data);
  });
}



designer.addSyncListener(function (data) {
  console.log("whiteboard================================")
  console.log(data)
  socket.emit('whiteboard', data);
});

designer.widgetHtmlURL = './widget.html'
designer.widgetJsURL = 'widget.min.js';

var x = 0;
var y = 0;
var width = designer.iframe.clientWidth;
var height = designer.iframe.clientHeight;

var image = 'https://www.webrtc-experiment.com/images/RTCMultiConnection-STUN-TURN-usage.png';

var points = [
  ['image', [image, x, y, width, height, 1], ['2', '#6c96c8', 'rgba(0,0,0,0)', '1', 'source-over', 'round', 'round', '15px "Arial"']]
];

designer.syncData({
  startIndex: 0,
  points: points
});
// demo: to download after 9sec
// setTimeout(event => {
//   console.log("stopping");
//   mediaRecorder.stop();
// }, 9000);



async function gotStream(stream) {
  console.log('Adding local stream.');
  localStream = stream;
  localVideo.srcObject = stream;
  sendMessage('got user media');
  if (isInitiator) {
    maybeStart();
  }
}


var constraints = {
  video: true
};

console.log('Getting user media with constraints', constraints);

if (location.hostname !== 'localhost') {
  requestTurn(
    'https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913'
  );
}

function maybeStart() {
  console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
  if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
    console.log('>>>>>> creating peer connection');
    createPeerConnection();
    pc.addStream(localStream);
    isStarted = true;
    console.log('isInitiator', isInitiator);
    if (isInitiator) {
      doCall();
    }
    console.log("whiteboard================================")
    designer.addSyncListener(function (data) {
      socket.emit('whiteboard', data);
    });
  }
}

window.onbeforeunload = function () {
  sendMessage('bye');
};

/////////////////////////////////////////////////////////
// PeerConnect 하기
function createPeerConnection() {
  try {
    pc = new RTCPeerConnection(null);
    pc.onicecandidate = handleIceCandidate;
    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    console.log('Created RTCPeerConnnection');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
    return;
  }
}

function handleIceCandidate(event) {
  console.log('icecandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  } else {
    console.log('End of candidates.');
  }
}

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

function doCall() {
  console.log('Sending offer to peer');
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
  console.log('Sending answer to peer.');
  pc.createAnswer().then(
    setLocalAndSendMessage,
    onCreateSessionDescriptionError
  );
}

function setLocalAndSendMessage(sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message', sessionDescription);
  sendMessage(sessionDescription);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function requestTurn(turnURL) {
  var turnExists = false;
  for (var i in pcConfig.iceServers) {
    if (pcConfig.iceServers[i].urls.substr(0, 5) === 'turn:') {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    console.log('Getting TURN server from ', turnURL);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var turnServer = JSON.parse(xhr.responseText);
        console.log('Got TURN server: ', turnServer);
        pcConfig.iceServers.push({
          'urls': 'turn:' + turnServer.username + '@' + turnServer.turn,
          'credential': turnServer.password
        });
        turnReady = true;
      }
    };
    xhr.open('GET', turnURL, true);
    xhr.send();
  }
}

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
  remoteStream = event.stream;
  remoteVideo.srcObject = remoteStream;

  remoteVideo.classList.add("remoteVideoInChatting");
  localVideo.classList.add("localVideoInChatting");
}

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

function hangup() {
  console.log('Hanging up.');
  stop();
  sendMessage('bye');
}

function handleRemoteHangup() {
  remoteVideo.classList.remove("remoteVideoInChatting");
  localVideo.classList.remove("localVideoInChatting");

  console.log('Session terminated.');
  stop();
  isInitiator = false;
}

function stop() {
  isStarted = false;
  pc.close();
  pc = null;
}

/**화자 감지 */
var audioContext = new AudioContext()
var gainNode = audioContext.createGain();
navigator.mediaDevices.getUserMedia({ audio: true })
  .then((stream) => {
    console.log('got stream', stream);
    window.orginalStream = stream;
    return stream;
  })
  .then((stream) => {
    let audioSource = audioContext.createMediaStreamSource(stream);
    let audioDestination = audioContext.createMediaStreamDestination();
    audioSource.connect(gainNode);
    gainNode.connect(audioDestination);
    gainNode.gain.value = 1;
    window.localStream = audioDestination.stream;
    //audioElement.srcObject = window.localStream; //for playback
    //you can add this stream to pc object
    // pc.addStream(window.localStream);
  })
  .catch((err) => {
    console.error('Something wrong in capture stream', err);
  })

