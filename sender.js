const Socket = new WebSocket("wss://192.168.1.3:3000")

autofill();

Socket.addEventListener("open", event => {
  console.log("WebSocket connection established.");
});

Socket.addEventListener("message", event => {
  console.log("Received message from server:", event.data);
});

Socket.addEventListener("close", event => {
  console.log("WebSocket connection closed.");
});

Socket.addEventListener("error", event => {
  console.log("WebSocket connection error:", event);
});

Socket.onmessage = (event) => {
  handleSignallingData(JSON.parse(event.data))
}

function handleSignallingData(data) {
  switch (data.type) {
    case "answer":
      peerConn.setRemoteDescription(data.answer)
      break
    case "candidate":
      peerConn.addIceCandidate(data.candidate)
  }
}

const leaveMeetingButton = document.getElementById('leave-meeting-button');
leaveMeetingButton.addEventListener('click', leaveMeeting);


let username;

function sendUsername() {
   username = document.getElementById("username-input").value;
  sendData({
    type: "store_user"// include the username in the data sent to the server
  });
  localStorage.setItem("samrat", document.getElementById("username-input").value)
}

function sendData(data) {
  data.username = username;
  Socket.send(JSON.stringify(data));


}

function autofill() {
  document.getElementById("username-input").value = localStorage.getItem('samrat')
}

let localStream;
let peerConn;
let peerConnections = [];

 async function startCall() {
  document.getElementById("video-call-div").style.display = "inline"
  document.getElementById("body1").style.background = "black"


  // Use getUserMedia instead of getDisplayMedia for video and audio
 await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true
  }).then((stream) => {

    let localStream = stream;
    let localVideo = document.getElementById("local-video");
    let remoteVideo = document.getElementById("remote-video");



    localVideo.srcObject = localStream;


    localVideo.srcObject.addEventListener("click", () => {
      [localVideo.srcObject, remoteVideo.srcObject] = [remoteVideo.srcObject, localVideo.srcObject];
    })


    let configuration = {
      iceServers: [{
        "urls": ["stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302"
        ]
      }]
    };

    peerConn = new RTCPeerConnection(configuration);

    peerConnections.push(peerConn);
    console.log(peerConnections)

    localStream.getTracks().forEach((track) => {
      peerConn.addTrack(track, localStream)
      console.log('localStream tracks added');
    })


    peerConn.ontrack = (e) => {

      // If there are already three people in the call, show the remote stream in the existing remote video element

      if (e.streams && e.streams.length > 0) {
        document.getElementById("remote-video").srcObject = e.streams[0];
        document.getElementById("wait-text").style.display = "none"
      }

    }



    peerConn.onicecandidate = ((e) => {
      if (e.candidate == null) {
        return;
      }
      sendData({
        type: "store_candidate",
        candidate: e.candidate
      });
    });

    createAndSendOffer();
  }).catch((error) => {
    console.error("error baby :" + error)
  })

}

function createAndSendOffer() {
  peerConn.createOffer((offer) => {
    sendData({
      type: "store_offer",
      offer: offer
    });

    peerConn.setLocalDescription(offer);
  }, (error) => {
    console.error("Error creating offer:", error);
  });
}


function leaveMeeting() {
  sendData({
    type: "leave_call"
  });

  // Disable the remote video of the user who has left the call
  const remoteVideo = document.getElementById("remote-video");
  localStream.getVideoTracks().forEach(track => track.enabled = false)

  // Close the RTCPeerConnection
  if (peerConn) {
    peerConn.close();
  }

  // Disconnect the WebSocket connection
  if (webSocket) {
    webSocket.close();
  }

  // Stop the local media stream
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }

  // Hide the video call UI
  document.getElementById("video-call-div").style.display = "none";
}
// Function to mute/unmute audio
function muteAudio() {
  localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
}

// Function to mute/unmute video
function muteVideo() {
  localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
}
